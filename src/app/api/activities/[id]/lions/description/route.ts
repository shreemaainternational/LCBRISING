import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { writeAudit } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/server';
import { validateActivityForLionsReport } from '@/lib/lions-report';
import { activityCategoryLabel } from '@/lib/activity-categories';
import {
  generateHumanizedLionsDescription,
  deterministicLionsDescription,
} from '@/lib/ai/lions-description';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const bodySchema = z.object({
  // If provided, an officer's manual edit is saved verbatim instead of
  // (re)generating one from the AI writer.
  text: z.string().trim().min(20).max(4000).optional(),
});

/** POST /api/activities/[id]/lions/description — generate or save the "Humanized Lions Description". */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: activity, error } = await db.from('activities').select('*').eq('id', id).maybeSingle();
  if (error || !activity) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('activity.create', { club_id: activity.club_id ?? null });
  if (isGuardFailure(actor)) return actor;

  const validation = validateActivityForLionsReport(activity);
  if (!validation.allOk) {
    return NextResponse.json({ error: 'validation_failed', validation }, { status: 422 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  let description = parsed.data.text ?? null;
  let source: 'manual' | 'ai' | 'template' = 'manual';

  if (!description) {
    const input = {
      title: activity.title,
      category: activity.category,
      date: activity.date,
      location: activity.location,
      description: activity.description,
      beneficiaries: Number(activity.beneficiaries ?? 0),
      lionMembers: Number(activity.lion_members_count ?? 0),
      serviceHours: Number(activity.service_hours ?? 0),
      expenses: Number(activity.expenses ?? 0),
      amountRaised: Number(activity.amount_raised ?? 0),
    };
    try {
      description = await generateHumanizedLionsDescription(input);
      source = 'ai';
    } catch {
      description = null;
    }
    if (!description) {
      description = deterministicLionsDescription(input);
      source = 'template';
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from('activities')
    .update({
      lions_description: description,
      lions_validation: validation,
      lions_status: 'validated',
      lions_validated_at: now,
    })
    .eq('id', id)
    .select('id, lions_description, lions_status, lions_validated_at')
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await writeAudit({
    action: 'activity.lions.description',
    entity: 'activity',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { source, cause: activityCategoryLabel(activity.category) },
  });

  return NextResponse.json({ activity: updated, validation, source });
}
