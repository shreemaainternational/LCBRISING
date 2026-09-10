import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { createAdminClient } from '@/lib/supabase/server';
import { runSyncJob, type SyncResult } from '@/lib/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DistrictSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().max(200).optional(),
  multiple_district_code: z.string().max(32).optional(),
  constitutional_area: z.string().max(120).optional(),
  status: z.string().max(60).optional(),
  governor_name: z.string().max(200).optional(),
  governor_email: z.string().max(200).optional(),
  governor_phone: z.string().max(60).optional(),
  first_vice_governor_name: z.string().max(200).optional(),
  second_vice_governor_name: z.string().max(200).optional(),
  cabinet_secretary_name: z.string().max(200).optional(),
  cabinet_treasurer_name: z.string().max(200).optional(),
  club_count: z.number().int().nonnegative().optional(),
  member_count: z.number().int().nonnegative().optional(),
  region_count: z.number().int().nonnegative().optional(),
  zone_count: z.number().int().nonnegative().optional(),
  effective_date: z.string().max(40).optional(),
  website: z.string().max(300).optional(),
  lions_year: z.string().max(20).optional(),
});

const BodySchema = z.object({
  districts: z.array(DistrictSchema).min(1).max(2000),
  filename: z.string().max(260).optional(),
  // When present (the DG console passes it), the upload is also recorded as a
  // district_sync_runs row so it shows in the Master Sync Console history.
  district_id: z.string().uuid().optional(),
});

function runStatus(r: SyncResult): 'success' | 'partial' | 'failed' {
  if (r.failed > 0 && r.inserted + r.updated > 0) return 'partial';
  if (r.failed > 0) return 'failed';
  return 'success';
}

/** Record the upload as a district_sync_runs row (best-effort, non-fatal). */
async function recordDistrictRun(opts: {
  districtId: string;
  memberId: string | null;
  startedAt: number;
  filename: string | null;
  result?: SyncResult;
  error?: string;
}): Promise<void> {
  try {
    const durationMs = Date.now() - opts.startedAt;
    const r = opts.result;
    const status = opts.error ? 'failed' : r ? runStatus(r) : 'failed';
    const totals = {
      fetched: r?.total ?? 0,
      inserted: r?.inserted ?? 0,
      updated: r?.updated ?? 0,
      skipped: r?.skipped ?? 0,
      errors: (r?.failed ?? 0) + (opts.error ? 1 : 0),
    };
    const report = {
      entity: 'district' as const,
      fetched: r?.total ?? 0,
      inserted: r?.inserted ?? 0,
      updated: r?.updated ?? 0,
      skipped: r?.skipped ?? 0,
      errors: [
        ...(opts.error ? [opts.error] : []),
        ...(r?.failures ?? []).map((f) => `row ${f.row}: ${f.reason}`),
      ],
      durationMs,
      dryRun: false,
    };
    await createAdminClient().from('district_sync_runs').insert({
      district_id: opts.districtId,
      trigger: 'manual',
      status,
      started_at: new Date(opts.startedAt).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      triggered_by: opts.memberId,
      totals,
      reports: [report],
      error_message: opts.error ?? null,
      notes: `Portal export upload${opts.filename ? ` — ${opts.filename}` : ''}`,
    });
  } catch {
    /* history is a convenience; never fail the upload over it */
  }
}

/**
 * POST /api/sync/districts/upload
 * Body: { districts: CanonicalDistrict[], district_id? } — parsed client-side
 * from the Lions Portal district export. Upserts into districts, records a
 * sync_logs run, and (when district_id is given) a district_sync_runs row so
 * the Master Sync Console history reflects the upload. RBAC: sync.trigger.
 */
export async function POST(req: Request) {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const { districts, filename, district_id } = parsed.data;
  const startedAt = Date.now();

  try {
    const { logId, result } = await runSyncJob({
      source: 'excel',
      entity: 'districts',
      payload: { districts, filename: filename ?? null },
      triggered_by: actor.member_id ?? null,
    });
    if (district_id) {
      await recordDistrictRun({
        districtId: district_id, memberId: actor.member_id ?? null,
        startedAt, filename: filename ?? null, result,
      });
    }
    return NextResponse.json({ ok: true, log_id: logId, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'district_upload_failed';
    if (district_id) {
      await recordDistrictRun({
        districtId: district_id, memberId: actor.member_id ?? null,
        startedAt, filename: filename ?? null, error: message,
      });
    }
    return NextResponse.json({ error: 'district_upload_failed', message }, { status: 500 });
  }
}
