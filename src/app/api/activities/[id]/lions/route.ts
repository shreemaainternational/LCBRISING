import { NextResponse } from 'next/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { can } from '@/lib/rbac/permissions';
import { createAdminClient } from '@/lib/supabase/server';
import { validateActivityForLionsReport, findLionsDuplicate } from '@/lib/lions-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/activities/[id]/lions — checklist + duplicate check for the Lions Portal panel. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('activity.read');
  if (isGuardFailure(actor)) return actor;

  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: activity, error } = await db.from('activities').select('*').eq('id', id).maybeSingle();
  if (error || !activity) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const validation = validateActivityForLionsReport(activity);
  const duplicate = await findLionsDuplicate(activity);

  return NextResponse.json({
    status: activity.lions_status ?? 'not_submitted',
    description: activity.lions_description ?? null,
    reportId: activity.lions_report_id ?? null,
    validatedAt: activity.lions_validated_at ?? null,
    readyAt: activity.lions_ready_at ?? null,
    submittedAt: activity.lions_submitted_at ?? null,
    validation,
    duplicate,
    canSubmit: can(actor.role, 'activity.lions.submit'),
  });
}
