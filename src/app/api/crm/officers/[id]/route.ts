import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { officerUpdateSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** Scope-target map for RBAC from an officer's scope. */
function scopeTargetFor(kind: string, id: string | null): Record<string, string | null> {
  const t: Record<string, string | null> = {};
  if (kind === 'club') t.club_id = id;
  if (kind === 'district') t.district_id = id;
  if (kind === 'zone') t.zone_id = id;
  if (kind === 'region') t.region_id = id;
  return t;
}

/**
 * Update an officer assignment — used by the "End Assignment" (status/term_end)
 * and "Add Officer Address" (address/contact) actions of Manage Officers.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = officerUpdateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const supa = await createClient();
  const { data: before } = await supa
    .from('officers')
    .select('id, scope_kind, scope_id, role')
    .eq('id', id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Ending an assignment needs officer.revoke; editing details needs officer.appoint.
  const perm = parsed.data.status === 'past' ? 'officer.revoke' : 'officer.appoint';
  const actor = await requirePermission(perm, scopeTargetFor(before.scope_kind, before.scope_id));
  if (isGuardFailure(actor)) return actor;

  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) if (v !== undefined) payload[k] = v === '' ? null : v;
  if (Object.keys(payload).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await supa.from('officers').update(payload).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: parsed.data.status === 'past' ? 'officer.revoke' : 'officer.update',
    entity: 'officer',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload,
  });

  return NextResponse.json({ officer: data });
}

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
