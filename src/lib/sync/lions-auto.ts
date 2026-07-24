/**
 * Lions Portal auto-sync orchestrator.
 *
 * The manual Lions sync (src/lib/oidc/lions.ts, /admin/sync/lions) needs a
 * human to click "Sync All". This wraps the same helpers into a single,
 * schedulable pipeline so the platform fetches from the Lions Portal and
 * updates itself automatically:
 *
 *   1. REST sync  — districts → clubs → members (syncLionsAll)
 *   2. DG-login   — district data via the stored governor credentials
 *   3. AI dedupe  — flag merged-member candidates for review (no auto-merge)
 *
 * Every entity run is mirrored into sync_logs so the Sync dashboard shows
 * automated runs alongside manual/CSV ones, and a singleton state row
 * records the latest outcome for the admin UI. Gated by the
 * `lions_auto_sync_enabled` / `lions_auto_dedupe_enabled` automation
 * toggles (both default ON) unless the caller forces a run.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import { getAutomationSettings } from '@/lib/automation/settings';
import { syncLionsAll, type LionsSyncReport } from '@/lib/oidc/lions';
import { isLionsPortalConfigured, syncLionsPortalDistricts } from '@/lib/oidc/lions-portal';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { loadLionsPortalSettings } from '@/lib/oidc/lions-portal-runtime';
import { scanDuplicates } from '@/lib/sync/dedupe';

export type AutoSyncTrigger = 'cron' | 'manual';
export type AutoSyncStatus = 'success' | 'partial' | 'failed' | 'skipped';

export interface AutoSyncSummary {
  status: AutoSyncStatus;
  trigger: AutoSyncTrigger;
  ranAt: string;
  durationMs: number;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  duplicates: number;
  reports: LionsSyncReport[];
  errorMessages: string[];
  skippedReason?: string;
}

/** Map a singular Lions report entity onto the plural sync_logs entity key. */
const ENTITY_KEY: Record<LionsSyncReport['entity'], string> = {
  district: 'districts',
  multi_district: 'districts',
  club: 'clubs',
  member: 'members',
  officer: 'officers',
  award: 'awards',
};

function reportStatus(r: LionsSyncReport): 'success' | 'partial' | 'failed' {
  const touched = r.inserted + r.updated;
  if (r.errors.length > 0 && touched > 0) return 'partial';
  if (r.errors.length > 0) return 'failed';
  return 'success';
}

/** Mirror a Lions sync report into sync_logs so the dashboard sees it. */
async function recordSyncLog(r: LionsSyncReport, triggeredBy: string | null): Promise<void> {
  try {
    const db = createAdminClient();
    const finishedAt = new Date().toISOString();
    const startedAt = new Date(Date.now() - Math.max(0, r.durationMs)).toISOString();
    await db.from('sync_logs').insert({
      source: 'lions_oidc',
      entity: ENTITY_KEY[r.entity] ?? r.entity,
      status: r.dryRun ? 'success' : reportStatus(r),
      triggered_by: triggeredBy,
      started_at: startedAt,
      finished_at: finishedAt,
      records_total: r.fetched,
      records_inserted: r.inserted,
      records_updated: r.updated,
      records_skipped: r.skipped,
      records_failed: r.errors.length,
      error_message: r.errors.length ? r.errors.slice(0, 5).join(' | ').slice(0, 4000) : null,
      context: { auto: true, dry_run: r.dryRun, duration_ms: r.durationMs },
    });
  } catch {
    /* non-fatal: logging must never break the sync */
  }
}

function rollUp(reports: LionsSyncReport[]): Pick<AutoSyncSummary, 'fetched' | 'inserted' | 'updated' | 'skipped' | 'errors' | 'errorMessages'> {
  return reports.reduce(
    (acc, r) => {
      acc.fetched += r.fetched;
      acc.inserted += r.inserted;
      acc.updated += r.updated;
      acc.skipped += r.skipped;
      acc.errors += r.errors.length;
      for (const e of r.errors) acc.errorMessages.push(`${r.entity}: ${e}`);
      return acc;
    },
    { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0, errorMessages: [] as string[] },
  );
}

async function writeState(summary: AutoSyncSummary): Promise<void> {
  try {
    const db = createAdminClient();
    const failed = summary.status === 'failed';
    // Read current consecutive_failures to increment/reset.
    const { data: prev } = await db
      .from('lions_auto_sync_state')
      .select('consecutive_failures')
      .eq('id', 'singleton')
      .maybeSingle();
    const prevFails = (prev?.consecutive_failures as number | undefined) ?? 0;

    await db.from('lions_auto_sync_state').upsert(
      {
        id: 'singleton',
        last_run_at: summary.ranAt,
        last_status: summary.status,
        last_trigger: summary.trigger,
        last_fetched: summary.fetched,
        last_inserted: summary.inserted,
        last_updated: summary.updated,
        last_skipped: summary.skipped,
        last_errors: summary.errors,
        last_duplicates: summary.duplicates,
        last_duration_ms: summary.durationMs,
        last_error_message: summary.errorMessages[0]?.slice(0, 4000) ?? summary.skippedReason ?? null,
        consecutive_failures: summary.status === 'skipped' ? prevFails : failed ? prevFails + 1 : 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch {
    /* non-fatal */
  }
}

/**
 * Run the full Lions auto-sync pipeline. Returns a summary and never throws
 * — individual entity failures are captured in the reports.
 */
export async function runLionsAutoSync(opts: {
  trigger?: AutoSyncTrigger;
  triggeredBy?: string | null;
  force?: boolean;
} = {}): Promise<AutoSyncSummary> {
  const trigger = opts.trigger ?? 'cron';
  const triggeredBy = opts.triggeredBy ?? null;
  const t0 = Date.now();
  const ranAt = new Date().toISOString();

  const settings = await getAutomationSettings();
  if (!opts.force && !settings.lions_auto_sync_enabled) {
    const summary: AutoSyncSummary = {
      status: 'skipped', trigger, ranAt, durationMs: Date.now() - t0,
      fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0, duplicates: 0,
      reports: [], errorMessages: [], skippedReason: 'lions_auto_sync_enabled is off',
    };
    await writeState(summary);
    return summary;
  }

  // Refresh runtime config from the DB before reading configured-ness.
  await Promise.all([loadLionsApiSettings(true), loadLionsPortalSettings(true)]);

  const reports: LionsSyncReport[] = [];

  // 1 + 2. REST districts → clubs → members.
  try {
    reports.push(...(await syncLionsAll()));
  } catch (e) {
    reports.push({
      entity: 'member', fetched: 0, inserted: 0, updated: 0, skipped: 0,
      errors: [String(e)], durationMs: 0, dryRun: false,
    });
  }

  // 3. DG-login district data (only when portal credentials are configured).
  if (isLionsPortalConfigured()) {
    try {
      reports.push(await syncLionsPortalDistricts());
    } catch (e) {
      reports.push({
        entity: 'district', fetched: 0, inserted: 0, updated: 0, skipped: 0,
        errors: [String(e)], durationMs: 0, dryRun: false,
      });
    }
  }

  // Mirror each report into sync_logs for dashboard visibility.
  for (const r of reports) await recordSyncLog(r, triggeredBy);

  const rolled = rollUp(reports);

  // 4. AI duplicate scan (flag only — never auto-merge).
  let duplicates = 0;
  if (settings.lions_auto_dedupe_enabled) {
    try {
      const rows = await scanDuplicates({ ai: true, max: 30 });
      duplicates = rows.filter((row) => (row.ai ? row.ai.isDuplicate : row.ruleScore >= 80)).length;
    } catch {
      /* dedupe is best-effort; a failure here doesn't fail the sync */
    }
  }

  const anyReal = reports.some((r) => !r.dryRun);
  const status: AutoSyncStatus =
    !anyReal ? 'success' // all dry-run (not configured) — nothing to report as a failure
    : rolled.errors > 0 && rolled.inserted + rolled.updated > 0 ? 'partial'
    : rolled.errors > 0 && rolled.fetched === 0 && rolled.inserted + rolled.updated === 0 ? 'failed'
    : rolled.errors > 0 ? 'partial'
    : 'success';

  const summary: AutoSyncSummary = {
    status, trigger, ranAt, durationMs: Date.now() - t0,
    fetched: rolled.fetched, inserted: rolled.inserted, updated: rolled.updated,
    skipped: rolled.skipped, errors: rolled.errors, duplicates,
    reports, errorMessages: rolled.errorMessages,
  };

  await writeState(summary);
  await writeAudit({
    action: status === 'failed' ? 'lions.auto_sync.failed' : 'lions.auto_sync',
    entity: 'lions_auto_sync',
    entity_id: 'singleton',
    actor_member_id: triggeredBy,
    payload: {
      trigger, status,
      counts: { fetched: summary.fetched, inserted: summary.inserted, updated: summary.updated, skipped: summary.skipped, errors: summary.errors, duplicates },
    },
  });

  return summary;
}

export interface AutoSyncState {
  last_run_at: string | null;
  last_status: AutoSyncStatus | null;
  last_trigger: AutoSyncTrigger | null;
  last_fetched: number;
  last_inserted: number;
  last_updated: number;
  last_skipped: number;
  last_errors: number;
  last_duplicates: number;
  last_duration_ms: number;
  last_error_message: string | null;
  consecutive_failures: number;
}

/** Read the singleton auto-sync state for the admin UI. Null if unavailable. */
export async function getAutoSyncState(): Promise<AutoSyncState | null> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('lions_auto_sync_state')
      .select('last_run_at, last_status, last_trigger, last_fetched, last_inserted, last_updated, last_skipped, last_errors, last_duplicates, last_duration_ms, last_error_message, consecutive_failures')
      .eq('id', 'singleton')
      .maybeSingle();
    if (!data) return null;
    return data as unknown as AutoSyncState;
  } catch {
    return null;
  }
}
