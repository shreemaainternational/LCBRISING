/**
 * Enterprise AI Automation Conductor.
 *
 * The platform already has the moving parts — Lions Portal auto-fetch
 * (src/lib/sync/lions-auto), an automation-jobs engine (src/lib/automation/
 * engine), an AI duplicate pass, and an integration-health registry. Each
 * runs on its own cron. This conductor supervises them as a single
 * orchestrated pipeline so the whole system runs — and keeps itself
 * running — without a human in the loop:
 *
 *   1. lions_fetch   — pull districts / clubs / members and update the DB.
 *   2. self_heal     — revive transiently-failed sync jobs and un-stick
 *                      automation jobs abandoned mid-run.
 *   3. jobs          — schedule + drain the automation_jobs queue.
 *   4. health        — snapshot the live/degraded/off integration registry.
 *   5. ai_digest     — an OpenAI-written ops summary + one recommended
 *                      action (deterministic fallback when no key).
 *   6. alert         — audit + best-effort admin push when a run regresses.
 *
 * Gated by the `enterprise_automation_enabled` / `auto_heal_enabled` /
 * `auto_alert_enabled` toggles (all default ON) unless the caller forces a
 * run. Never throws — every step captures its own failure into the summary
 * so one broken step can't sink the whole run.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import { getAutomationSettings } from '@/lib/automation/settings';
import { runLionsAutoSync, getAutoSyncState, type AutoSyncSummary } from '@/lib/sync/lions-auto';
import {
  processJobs,
  scheduleDuesReminders,
  schedulePaymentReminders,
  runRecurringInvoices,
  expireStaleInvoices,
  scheduleOfficerDigest,
  scheduleDailyGreetings,
} from '@/lib/automation/engine';
import { summarizeIntegrations } from '@/lib/integrations-registry';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { loadCronSecret } from '@/lib/cron-auth';
import { loadVapidConfig } from '@/lib/push-config';
import { loadOpenAiConfig } from '@/lib/ai/openai-config';
import { loadCanvaRuntime } from '@/lib/canva/config';
import { broadcastToTopic } from '@/lib/push';

export type ConductorTrigger = 'cron' | 'manual';
export type ConductorStatus = 'healthy' | 'degraded' | 'critical' | 'failed' | 'skipped';
export type StepStatus = 'ok' | 'warn' | 'error' | 'skipped';

/** How a conductor run reached the admin — used for alert copy. */
const STATUS_LABEL: Record<ConductorStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  critical: 'Critical',
  failed: 'Failed',
  skipped: 'Skipped',
};

export interface ConductorStep {
  key: string;
  label: string;
  status: StepStatus;
  detail: string;
  counts?: Record<string, number>;
  durationMs: number;
}

export interface ConductorCounts {
  fetched: number;
  inserted: number;
  updated: number;
  duplicates: number;
  healed: number;
  jobsProcessed: number;
  jobsFailed: number;
  integrationsLive: number;
  integrationsDegraded: number;
  integrationsOff: number;
  deadSyncJobs: number;
}

export interface ConductorSummary {
  status: ConductorStatus;
  trigger: ConductorTrigger;
  ranAt: string;
  durationMs: number;
  healthScore: number;
  steps: ConductorStep[];
  counts: ConductorCounts;
  aiSummary: string;
  aiRecommendation: string;
  aiSource: 'ai' | 'template';
  consecutiveFailures: number;
  skippedReason?: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Load the runtime config the integration registry reads, so the health
 *  snapshot reflects live/degraded/off accurately in a headless cron. */
async function warmRuntimeConfig(): Promise<void> {
  await Promise.allSettled([
    loadOidcSettings(true),
    loadLionsApiSettings(true),
    loadCronSecret(true),
    loadVapidConfig(true),
    loadOpenAiConfig(true),
    loadCanvaRuntime(true),
  ]);
}

/**
 * Self-heal: revive transiently-failed sync jobs and un-stick automation
 * jobs abandoned mid-run. Returns the number of rows healed and how many
 * sync jobs are permanently dead (exhausted retries — need a human).
 * Never throws.
 */
async function selfHeal(): Promise<{ healed: number; deadSyncJobs: number; detail: string }> {
  const db = createAdminClient();
  let healed = 0;
  let deadSyncJobs = 0;
  const notes: string[] = [];

  // 1. sync_queue: flip transiently-failed rows back to pending so the next
  //    worker pass retries them. Leave 'dead' rows alone (retries exhausted)
  //    but count them — those feed the health score and the alert.
  try {
    const { data: revived } = await db
      .from('sync_queue')
      .update({ status: 'pending', next_retry_at: new Date().toISOString(), last_error: null })
      .eq('status', 'failed')
      .select('id');
    const n = revived?.length ?? 0;
    healed += n;
    if (n) notes.push(`revived ${n} failed sync job${n === 1 ? '' : 's'}`);

    const { count } = await db
      .from('sync_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'dead');
    deadSyncJobs = count ?? 0;
  } catch {
    /* non-fatal */
  }

  // 2. automation_jobs: a job stuck in 'running' for >15 min means the worker
  //    died mid-handler. Flip it back to pending for a clean retry.
  try {
    const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: unstuck } = await db
      .from('automation_jobs')
      .update({ status: 'pending' })
      .eq('status', 'running')
      .lt('updated_at', cutoff)
      .select('id');
    const n = unstuck?.length ?? 0;
    healed += n;
    if (n) notes.push(`un-stuck ${n} stalled job${n === 1 ? '' : 's'}`);
  } catch {
    /* non-fatal */
  }

  return {
    healed,
    deadSyncJobs,
    detail: notes.length ? notes.join('; ') : 'Nothing to heal',
  };
}

/** Schedule + drain the automation_jobs queue. Mirrors /api/cron/automation
 *  (schedule=1) so the conductor is a superset of the daily engine run. */
async function runAutomationJobs(): Promise<{ processed: number; failed: number; scheduled: number; detail: string }> {
  const [dues, invoices, recurring, expired, digest, greetings] = await Promise.all([
    scheduleDuesReminders(),
    schedulePaymentReminders(),
    runRecurringInvoices(),
    expireStaleInvoices(),
    scheduleOfficerDigest(),
    scheduleDailyGreetings(),
  ]);
  const scheduled = dues + invoices + recurring + expired + digest + greetings.birthday + greetings.anniversary;
  const results = await processJobs(50);
  const failed = results.filter((r) => !r.ok).length;
  return {
    processed: results.length,
    failed,
    scheduled,
    detail: `${scheduled} scheduled · ${results.length} processed · ${failed} failed`,
  };
}

/** Score the platform 0..100 from the run's signals. Explainable, not magic. */
function computeHealthScore(input: {
  live: number;
  degraded: number;
  off: number;
  total: number;
  lionsStatus: string | null;
  lionsConsecutiveFailures: number;
  deadSyncJobs: number;
  jobsFailed: number;
}): number {
  const total = input.total || 1;
  let score = 100;
  score -= Math.round((input.off / total) * 30);        // off integrations: up to -30
  score -= Math.round((input.degraded / total) * 12);   // sandbox/auto: up to -12
  if (input.lionsStatus === 'failed') score -= 25;
  else if (input.lionsStatus === 'partial') score -= 10;
  score -= Math.min(input.lionsConsecutiveFailures * 8, 24);
  score -= Math.min(input.deadSyncJobs * 2, 16);
  score -= Math.min(input.jobsFailed * 3, 15);
  return clamp(Math.round(score), 0, 100);
}

/** AI ops digest: two sentences + one recommended action. Uses OpenAI when a
 *  key is configured, otherwise a deterministic template. Never throws. */
async function assessHealth(ctx: {
  status: ConductorStatus;
  healthScore: number;
  counts: ConductorCounts;
  steps: ConductorStep[];
  lionsStatus: string | null;
}): Promise<{ summary: string; recommendation: string; source: 'ai' | 'template' }> {
  const fallback = templateDigest(ctx);
  const cfg = await loadOpenAiConfig().catch(() => null);
  if (!cfg) return { ...fallback, source: 'template' };

  const sys =
    'You are the site-reliability lead for the Lions Club of Baroda Rising Star enterprise platform. ' +
    'You are handed a JSON snapshot of one automated conductor run. Reply with VALID JSON only: ' +
    '{ "summary": string (<= 2 sentences, plain English, what happened and whether the platform is healthy), ' +
    '"recommendation": string (<= 1 sentence, the single most useful next action, or "No action needed") }. ' +
    'Be factual; never invent numbers beyond the snapshot.';
  const user = JSON.stringify({
    status: ctx.status,
    healthScore: ctx.healthScore,
    lionsStatus: ctx.lionsStatus,
    counts: ctx.counts,
    steps: ctx.steps.map((s) => ({ key: s.key, status: s.status, detail: s.detail })),
  });

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return { ...fallback, source: 'template' };
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(json.choices[0].message.content) as { summary?: string; recommendation?: string };
    const summary = (parsed.summary ?? '').trim();
    const recommendation = (parsed.recommendation ?? '').trim();
    if (!summary) return { ...fallback, source: 'template' };
    return {
      summary,
      recommendation: recommendation || fallback.recommendation,
      source: 'ai',
    };
  } catch {
    return { ...fallback, source: 'template' };
  }
}

/** Deterministic ops digest — used when OpenAI is unavailable, and as the
 *  seed the AI refines. Always produces something honest and specific. */
function templateDigest(ctx: {
  status: ConductorStatus;
  healthScore: number;
  counts: ConductorCounts;
  lionsStatus: string | null;
}): { summary: string; recommendation: string } {
  const c = ctx.counts;
  const summary =
    `Conductor run is ${STATUS_LABEL[ctx.status].toLowerCase()} (health ${ctx.healthScore}/100). ` +
    `Lions fetch touched ${c.inserted + c.updated} record${c.inserted + c.updated === 1 ? '' : 's'} ` +
    `(${c.fetched} fetched, ${c.duplicates} duplicate candidate${c.duplicates === 1 ? '' : 's'}); ` +
    `self-heal fixed ${c.healed}; ${c.jobsProcessed} automation job${c.jobsProcessed === 1 ? '' : 's'} processed ` +
    `with ${c.jobsFailed} failure${c.jobsFailed === 1 ? '' : 's'}. ` +
    `Integrations: ${c.integrationsLive} live, ${c.integrationsDegraded} sandbox/auto, ${c.integrationsOff} off.`;

  let recommendation = 'No action needed — the platform is running itself.';
  if (ctx.lionsStatus === 'failed') recommendation = 'Check the Lions Portal REST credentials — the last fetch failed.';
  else if (c.deadSyncJobs > 0) recommendation = `Review ${c.deadSyncJobs} dead sync job${c.deadSyncJobs === 1 ? '' : 's'} in /admin/sync — retries are exhausted.`;
  else if (c.jobsFailed > 0) recommendation = 'Inspect failed automation jobs on /admin/automation for the error detail.';
  else if (c.integrationsOff > 0) recommendation = `Activate ${c.integrationsOff} pending integration${c.integrationsOff === 1 ? '' : 's'} on /admin/integrations to reach full health.`;
  return { summary, recommendation };
}

/** Best-effort admin alert. Never throws. */
async function alertAdmins(summary: ConductorSummary): Promise<void> {
  await writeAudit({
    action: 'automation.conductor.alert',
    entity: 'automation_conductor',
    entity_id: 'singleton',
    payload: {
      status: summary.status,
      health_score: summary.healthScore,
      consecutive_failures: summary.consecutiveFailures,
      recommendation: summary.aiRecommendation,
      counts: summary.counts,
    },
  }).catch(() => {});

  try {
    await broadcastToTopic('automation-alerts', {
      title: `Automation ${STATUS_LABEL[summary.status]} · health ${summary.healthScore}/100`,
      body: summary.aiRecommendation || summary.aiSummary.slice(0, 180),
      url: '/admin/automation/enterprise',
      tag: 'automation-conductor',
      data: { status: summary.status, healthScore: summary.healthScore },
    });
  } catch {
    /* push is best-effort */
  }
}

async function persist(summary: ConductorSummary): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from('automation_conductor_state').upsert(
      {
        id: 'singleton',
        last_run_at: summary.ranAt,
        last_status: summary.status,
        last_trigger: summary.trigger,
        health_score: summary.healthScore,
        duration_ms: summary.durationMs,
        steps: summary.steps,
        counts: summary.counts,
        ai_summary: summary.aiSummary,
        ai_recommendation: summary.aiRecommendation,
        ai_source: summary.aiSource,
        consecutive_failures: summary.consecutiveFailures,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    await db.from('automation_conductor_log').insert({
      ran_at: summary.ranAt,
      trigger: summary.trigger,
      status: summary.status,
      health_score: summary.healthScore,
      duration_ms: summary.durationMs,
      counts: summary.counts,
      ai_summary: summary.aiSummary,
    });

    // Trim history to the newest 200 rows.
    const { data: keep } = await db
      .from('automation_conductor_log')
      .select('ran_at')
      .order('ran_at', { ascending: false })
      .range(199, 199);
    const cutoff = keep?.[0]?.ran_at;
    if (cutoff) {
      await db.from('automation_conductor_log').delete().lt('ran_at', cutoff);
    }
  } catch {
    /* non-fatal: persistence must never break the run */
  }
}

/**
 * Run the enterprise conductor. Returns a summary and never throws.
 *
 * @param opts.deep    When true (the daily run), performs the Lions Portal
 *                     auto-fetch. When false (lighter interim runs), skips
 *                     the fetch and only heals / drains / health-checks.
 * @param opts.force   Bypass the master toggle and force the Lions fetch
 *                     even when its own toggle is off (admin "Run now").
 */
export async function runEnterpriseAutomation(opts: {
  trigger?: ConductorTrigger;
  triggeredBy?: string | null;
  deep?: boolean;
  force?: boolean;
} = {}): Promise<ConductorSummary> {
  const trigger = opts.trigger ?? 'cron';
  const deep = opts.deep ?? true;
  const t0 = Date.now();
  const ranAt = new Date().toISOString();

  const settings = await getAutomationSettings();

  const emptyCounts: ConductorCounts = {
    fetched: 0, inserted: 0, updated: 0, duplicates: 0, healed: 0,
    jobsProcessed: 0, jobsFailed: 0,
    integrationsLive: 0, integrationsDegraded: 0, integrationsOff: 0, deadSyncJobs: 0,
  };

  // Master switch. Forced manual runs always proceed.
  if (!opts.force && !settings.enterprise_automation_enabled) {
    const summary: ConductorSummary = {
      status: 'skipped', trigger, ranAt, durationMs: Date.now() - t0, healthScore: 0,
      steps: [], counts: emptyCounts, aiSummary: 'Enterprise conductor is turned off.',
      aiRecommendation: 'Enable the Enterprise AI conductor toggle on /admin/automation to resume.',
      aiSource: 'template', consecutiveFailures: 0, skippedReason: 'enterprise_automation_enabled is off',
    };
    await persist(summary);
    return summary;
  }

  const steps: ConductorStep[] = [];
  const counts: ConductorCounts = { ...emptyCounts };

  // 1. Lions Portal auto-fetch (deep runs only).
  let lionsStatus: string | null = null;
  if (deep) {
    const s0 = Date.now();
    try {
      const res: AutoSyncSummary = await runLionsAutoSync({
        trigger: trigger === 'manual' ? 'manual' : 'cron',
        triggeredBy: opts.triggeredBy ?? null,
        force: opts.force,
      });
      lionsStatus = res.status;
      counts.fetched += res.fetched;
      counts.inserted += res.inserted;
      counts.updated += res.updated;
      counts.duplicates += res.duplicates;
      steps.push({
        key: 'lions_fetch',
        label: 'Lions Portal auto-fetch',
        status: res.status === 'failed' ? 'error' : res.status === 'partial' ? 'warn' : res.status === 'skipped' ? 'skipped' : 'ok',
        detail: res.status === 'skipped'
          ? (res.skippedReason ?? 'Auto-sync toggle is off')
          : `${res.fetched} fetched · ${res.inserted} new · ${res.updated} updated · ${res.duplicates} dup${res.duplicates === 1 ? '' : 's'}`,
        counts: { fetched: res.fetched, inserted: res.inserted, updated: res.updated, duplicates: res.duplicates, errors: res.errors },
        durationMs: Date.now() - s0,
      });
    } catch (e) {
      steps.push({ key: 'lions_fetch', label: 'Lions Portal auto-fetch', status: 'error', detail: String(e), durationMs: Date.now() - s0 });
    }
  } else {
    // Read the last known Lions status so health scoring stays accurate.
    const st = await getAutoSyncState().catch(() => null);
    lionsStatus = st?.last_status ?? null;
    steps.push({ key: 'lions_fetch', label: 'Lions Portal auto-fetch', status: 'skipped', detail: 'Interim run — full fetch runs on the daily deep pass', durationMs: 0 });
  }

  // 2. Self-heal.
  if (settings.auto_heal_enabled) {
    const s0 = Date.now();
    const heal = await selfHeal();
    counts.healed += heal.healed;
    counts.deadSyncJobs = heal.deadSyncJobs;
    steps.push({
      key: 'self_heal',
      label: 'Self-healing',
      status: heal.deadSyncJobs > 0 ? 'warn' : 'ok',
      detail: heal.deadSyncJobs > 0 ? `${heal.detail} · ${heal.deadSyncJobs} dead (needs review)` : heal.detail,
      counts: { healed: heal.healed, dead: heal.deadSyncJobs },
      durationMs: Date.now() - s0,
    });
  } else {
    steps.push({ key: 'self_heal', label: 'Self-healing', status: 'skipped', detail: 'auto_heal_enabled is off', durationMs: 0 });
  }

  // 3. Automation jobs.
  {
    const s0 = Date.now();
    try {
      const jobs = await runAutomationJobs();
      counts.jobsProcessed += jobs.processed;
      counts.jobsFailed += jobs.failed;
      steps.push({
        key: 'jobs',
        label: 'Automation jobs',
        status: jobs.failed > 0 ? 'warn' : 'ok',
        detail: jobs.detail,
        counts: { scheduled: jobs.scheduled, processed: jobs.processed, failed: jobs.failed },
        durationMs: Date.now() - s0,
      });
    } catch (e) {
      steps.push({ key: 'jobs', label: 'Automation jobs', status: 'error', detail: String(e), durationMs: Date.now() - s0 });
    }
  }

  // 4. Integration health snapshot.
  {
    const s0 = Date.now();
    try {
      await warmRuntimeConfig();
      const sum = summarizeIntegrations();
      counts.integrationsLive = sum.live;
      counts.integrationsDegraded = sum.degraded;
      counts.integrationsOff = sum.off;
      steps.push({
        key: 'health',
        label: 'Integration health',
        status: sum.off > 0 ? 'warn' : 'ok',
        detail: `${sum.live}/${sum.total} live · ${sum.degraded} sandbox/auto · ${sum.off} off`,
        counts: { live: sum.live, degraded: sum.degraded, off: sum.off, total: sum.total },
        durationMs: Date.now() - s0,
      });
    } catch (e) {
      steps.push({ key: 'health', label: 'Integration health', status: 'error', detail: String(e), durationMs: Date.now() - s0 });
    }
  }

  // Health score + overall status.
  const lionsState = await getAutoSyncState().catch(() => null);
  const healthScore = computeHealthScore({
    live: counts.integrationsLive,
    degraded: counts.integrationsDegraded,
    off: counts.integrationsOff,
    total: counts.integrationsLive + counts.integrationsDegraded + counts.integrationsOff,
    lionsStatus,
    lionsConsecutiveFailures: lionsState?.consecutive_failures ?? 0,
    deadSyncJobs: counts.deadSyncJobs,
    jobsFailed: counts.jobsFailed,
  });
  const hardFailure = steps.some((s) => s.status === 'error' && (s.key === 'lions_fetch' || s.key === 'jobs'));
  const status: ConductorStatus =
    hardFailure && healthScore < 40 ? 'failed'
    : healthScore >= 85 ? 'healthy'
    : healthScore >= 60 ? 'degraded'
    : 'critical';

  // 5. AI digest.
  const digest = await assessHealth({ status, healthScore, counts, steps, lionsStatus });
  steps.push({
    key: 'ai_digest',
    label: 'AI health digest',
    status: 'ok',
    detail: digest.source === 'ai' ? 'AI-written ops summary' : 'Template summary (no OpenAI key)',
    durationMs: 0,
  });

  // Consecutive-failure tracking.
  let prevFails = 0;
  try {
    const { data: prev } = await createAdminClient()
      .from('automation_conductor_state')
      .select('consecutive_failures')
      .eq('id', 'singleton')
      .maybeSingle();
    prevFails = (prev?.consecutive_failures as number | undefined) ?? 0;
  } catch {
    /* first run / table missing — treat as zero */
  }
  const regressed = status === 'failed' || status === 'critical';
  const consecutiveFailures = regressed ? prevFails + 1 : 0;

  const summary: ConductorSummary = {
    status, trigger, ranAt, durationMs: Date.now() - t0, healthScore,
    steps, counts, aiSummary: digest.summary, aiRecommendation: digest.recommendation,
    aiSource: digest.source, consecutiveFailures,
  };

  await persist(summary);

  // 6. Alert on regression.
  if (settings.auto_alert_enabled && regressed) {
    await alertAdmins(summary);
  }

  await writeAudit({
    action: status === 'failed' ? 'automation.conductor.failed' : 'automation.conductor.run',
    entity: 'automation_conductor',
    entity_id: 'singleton',
    actor_member_id: opts.triggeredBy ?? null,
    payload: { trigger, status, healthScore, deep, counts },
  }).catch(() => {});

  return summary;
}

export interface ConductorState {
  last_run_at: string | null;
  last_status: ConductorStatus | null;
  last_trigger: ConductorTrigger | null;
  health_score: number;
  duration_ms: number;
  steps: ConductorStep[];
  counts: Partial<ConductorCounts>;
  ai_summary: string | null;
  ai_recommendation: string | null;
  ai_source: string | null;
  consecutive_failures: number;
}

/** Read the singleton conductor state for the admin UI. Null if unavailable. */
export async function getConductorState(): Promise<ConductorState | null> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('automation_conductor_state')
      .select('last_run_at, last_status, last_trigger, health_score, duration_ms, steps, counts, ai_summary, ai_recommendation, ai_source, consecutive_failures')
      .eq('id', 'singleton')
      .maybeSingle();
    if (!data) return null;
    return data as unknown as ConductorState;
  } catch {
    return null;
  }
}

export interface ConductorLogRow {
  id: string;
  ran_at: string;
  trigger: string | null;
  status: string | null;
  health_score: number;
  duration_ms: number;
  ai_summary: string | null;
}

/** Recent conductor runs for the history table. */
export async function getConductorLog(limit = 20): Promise<ConductorLogRow[]> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('automation_conductor_log')
      .select('id, ran_at, trigger, status, health_score, duration_ms, ai_summary')
      .order('ran_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as unknown as ConductorLogRow[];
  } catch {
    return [];
  }
}
