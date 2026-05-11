import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Revoke an officer term. Soft action: marks the row `past` and stamps
 * `term_end`. RBAC: officer.revoke within the relevant scope.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = await createClient();
  const { data: before } = await supa
    .from('officers')
    .select('id, scope_kind, scope_id, member_id, role, status')
    .eq('id', id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const scopeTarget: Record<string, string | null> = {};
  if (before.scope_kind === 'club') scopeTarget.club_id = before.scope_id;
  if (before.scope_kind === 'district') scopeTarget.district_id = before.scope_id;
  if (before.scope_kind === 'zone') scopeTarget.zone_id = before.scope_id;
  if (before.scope_kind === 'region') scopeTarget.region_id = before.scope_id;

  const actor = await requirePermission('officer.revoke', scopeTarget);
  if (isGuardFailure(actor)) return actor;

  const { error } = await supa
    .from('officers')
    .update({ status: 'past', term_end: new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'officer.revoke',
    entity: 'officer',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { scope_kind: before.scope_kind, scope_id: before.scope_id, role: before.role },
  });

  return NextResponse.json({ ok: true });
}
