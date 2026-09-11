import { NextResponse } from 'next/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { writeAudit } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/server';
import { validateActivityForLionsReport, findLionsDuplicate } from '@/lib/lions-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/activities/[id]/lions/ready — mark "READY FOR LIONS PORTAL".
 * Requires the checklist to pass, a description to already be saved, and
 * no known duplicate submission.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: activity, error } = await db.from('activities').select('*').eq('id', id).maybeSingle();
  if (error || !activity) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('activity.create', { club_id: activity.club_id ?? null });
  if (isGuardFailure(actor)) return actor;

  if (activity.lions_status === 'submitted') {
    return NextResponse.json({ error: 'already_submitted', reportId: activity.lions_report_id }, { status: 409 });
  }

  const validation = validateActivityForLionsReport(activity);
  if (!validation.allOk) {
    return NextResponse.json({ error: 'validation_failed', validation }, { status: 422 });
  }
  if (!activity.lions_description) {
    return NextResponse.json({ error: 'description_missing' }, { status: 422 });
  }

  const duplicate = await findLionsDuplicate(activity);
  if (duplicate) {
    return NextResponse.json({ error: 'duplicate', duplicate }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from('activities')
    .update({ lions_status: 'ready', lions_ready_at: now })
    .eq('id', id)
    .select('id, lions_status, lions_ready_at')
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await writeAudit({
    action: 'activity.lions.ready',
    entity: 'activity',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
  });

  return NextResponse.json({ activity: updated });
}
