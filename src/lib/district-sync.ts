/**
 * District Master Sync — orchestrates the existing Lions adapter
 * (districts → clubs → members) into one operation that's recorded
 * end-to-end in district_sync_runs for audit. Pluggable trigger
 * ("manual" from the admin UI, "scheduled" from cron, "webhook"
 * from an LCI push).
 */
import { createAdminClient } from '@/lib/supabase/server';
import {
  syncLionsDistricts, syncLionsClubs, syncLionsMembers,
  isLionsApiConfigured, isLionsApiSandboxActive,
  type LionsSyncReport,
} from '@/lib/oidc/lions';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { loadLionsPortalSettings } from '@/lib/oidc/lions-portal-runtime';
import { isLionsPortalConfigured, syncLionsPortalDistricts } from '@/lib/oidc/lions-portal';

export type DistrictSyncTrigger = 'manual' | 'scheduled' | 'webhook' | 'api';

export interface DistrictSyncResult {
  runId: string;
  status: 'success' | 'partial' | 'failed';
  durationMs: number;
  totals: { fetched: number; inserted: number; updated: number; skipped: number; errors: number };
  reports: LionsSyncReport[];
  sandbox: boolean;
  configured: boolean;
}

export async function runDistrictMasterSync(opts: {
  districtId?: string | null;
  trigger?: DistrictSyncTrigger;
  triggeredBy?: string | null;
} = {}): Promise<DistrictSyncResult> {
  const db = createAdminClient();
  // Refresh the runtime credential caches so the peek-based config checks
  // below (REST adapter + DG portal login) reflect the latest DB settings.
  await Promise.all([loadLionsApiSettings(true), loadLionsPortalSettings(true)]);
  const portalConfigured = isLionsPortalConfigured();
  const sandbox = isLionsApiSandboxActive();
  const configured = isLionsApiConfigured() || portalConfigured;

  // Create a "running" row up front so the UI can show progress.
  const { data: run } = await db.from('district_sync_runs').insert({
    district_id: opts.districtId ?? null,
    trigger: opts.trigger ?? 'manual',
    status: 'running',
    triggered_by: opts.triggeredBy ?? null,
  }).select('id').single();
  const runId = run?.id as string;

  const t0 = Date.now();
  const reports: LionsSyncReport[] = [];
  let errorMsg: string | null = null;

  try {
    // District data comes from the DG portal login when configured
    // (credential → token endpoint), otherwise from the REST adapter.
    reports.push(portalConfigured ? await syncLionsPortalDistricts() : await syncLionsDistricts());
    reports.push(await syncLionsClubs());
    reports.push(await syncLionsMembers());
  } catch (e) {
    errorMsg = String(e);
  }

  const durationMs = Date.now() - t0;
  const totals = reports.reduce((acc, r) => ({
    fetched:  acc.fetched  + r.fetched,
    inserted: acc.inserted + r.inserted,
    updated:  acc.updated  + r.updated,
    skipped:  acc.skipped  + r.skipped,
    errors:   acc.errors   + r.errors.length,
  }), { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 });

  const status: DistrictSyncResult['status'] =
    errorMsg ? 'failed' :
    totals.errors > 0 ? 'partial' :
    'success';

  await db.from('district_sync_runs').update({
    status,
    finished_at: new Date().toISOString(),
    duration_ms: durationMs,
    totals,
    reports,
    error_message: errorMsg,
  }).eq('id', runId);

  return { runId, status, durationMs, totals, reports, sandbox, configured };
}
