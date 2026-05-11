import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { officerSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission('officer.read');
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();
  const { data, error } = await supa
    .from('officers')
    .select('id, member_id, role, term_start, term_end, status, notes, created_at')
    .eq('scope_kind', 'club')
    .eq('scope_id', id)
    .order('term_start', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ officers: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clubId } = await params;
  const parsed = officerSchema
    .omit({ scope_kind: true, scope_id: true })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('officer.appoint', { club_id: clubId });
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();
  const { data, error } = await supa
    .from('officers')
    .insert({
      ...parsed.data,
      scope_kind: 'club',
      scope_id: clubId,
      appointed_by: actor.member_id ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'officer.appoint',
    entity: 'officer',
    entity_id: data.id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { club_id: clubId, role: parsed.data.role, member_id: parsed.data.member_id },
  });
  return NextResponse.json({ officer: data }, { status: 201 });
}
