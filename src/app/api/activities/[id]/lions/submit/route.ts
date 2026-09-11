import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { writeAudit } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/server';
import { findLionsDuplicate } from '@/lib/lions-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  lionsReportId: z.string().trim().min(2).max(120),
});

/**
 * POST /api/activities/[id]/lions/submit — the "AUTHORIZED USER" step.
 * Records the confirmation / Service Activity ID an officer received after
 * filing this activity by hand on the actual Lions Portal (there is no
 * public submission API to call on their behalf). Gated to club
 * president/secretary via the `activity.lions.submit` permission.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: activity, error } = await db.from('activities').select('*').eq('id', id).maybeSingle();
  if (error || !activity) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('activity.lions.submit', { club_id: activity.club_id ?? null });
  if (isGuardFailure(actor)) return actor;

  if (activity.lions_status === 'submitted') {
    return NextResponse.json({ error: 'already_submitted', reportId: activity.lions_report_id }, { status: 409 });
  }
  if (activity.lions_status !== 'ready') {
    return NextResponse.json({ error: 'not_ready' }, { status: 422 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  // Re-check for a duplicate right before we commit — a second officer, or a
  // reconciliation import, could have filed this between "ready" and now.
  const duplicate = await findLionsDuplicate(activity);
  if (duplicate) {
    return NextResponse.json({ error: 'duplicate', duplicate }, { status: 409 });
  }

  const { data: reportIdTaken } = await db
    .from('activities')
    .select('id')
    .eq('lions_report_id', parsed.data.lionsReportId)
    .neq('id', id)
    .maybeSingle();
  if (reportIdTaken) {
    return NextResponse.json({ error: 'report_id_already_used' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from('activities')
    .update({
      lions_status: 'submitted',
      lions_report_id: parsed.data.lionsReportId,
      lions_submitted_at: now,
      lions_submitted_by: actor.member_id ?? null,
      reported_to_district: true,
    })
    .eq('id', id)
    .select('id, lions_status, lions_report_id, lions_submitted_at, lions_submitted_by')
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await writeAudit({
    action: 'activity.lions.submit',
    entity: 'activity',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { lions_report_id: parsed.data.lionsReportId },
  });

  return NextResponse.json({ activity: updated });
}
