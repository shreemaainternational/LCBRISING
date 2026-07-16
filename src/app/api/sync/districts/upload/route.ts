import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { runSyncJob } from '@/lib/sync';

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
});

/**
 * POST /api/sync/districts/upload
 * Body: { districts: CanonicalDistrict[] } — parsed client-side from the
 * Lions Portal district export. Upserts into districts and records a
 * sync_logs run. RBAC: sync.trigger.
 */
export async function POST(req: Request) {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const { logId, result } = await runSyncJob({
      source: 'excel',
      entity: 'districts',
      payload: { districts: parsed.data.districts, filename: parsed.data.filename ?? null },
      triggered_by: actor.member_id ?? null,
    });
    return NextResponse.json({ ok: true, log_id: logId, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'district_upload_failed';
    return NextResponse.json({ error: 'district_upload_failed', message }, { status: 500 });
  }
}
