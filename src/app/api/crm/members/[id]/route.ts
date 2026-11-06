import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { enterpriseMemberSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Trusted admin reads/writes (gated by requirePermission at each call site).
// Use the service-role client so queries against public.members bypass RLS and
// avoid "infinite recursion detected in policy for relation members" on
// databases where migration 0059 has not been applied.
function memberDb() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
}

async function fetchMember(id: string) {
  const supa = memberDb() ?? await createClient();
  const { data } = await supa
    .from('members')
    .select('id, name, email, phone, whatsapp, club_id, district_id, lions_role, lions_member_id, status, joined_at, birthday, avatar_url')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  return data;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission('member.read');
  if (isGuardFailure(actor)) return actor;
  const m = await fetchMember(id);
  if (!m) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ member: m });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = enterpriseMemberSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const before = await fetchMember(id);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('member.update', {
    club_id: before.club_id ?? null,
    district_id: before.district_id ?? null,
  });
  if (isGuardFailure(actor)) return actor;

  const supa = memberDb() ?? await createClient();

  // Changing the club is a transfer: it needs the transfer permission, not
  // just member.update, and the target must be a live club. (History is
  // recorded by the members trigger from migration 0088.)
  const clubChanging = parsed.data.club_id !== undefined && (parsed.data.club_id ?? null) !== (before.club_id ?? null);
  if (clubChanging) {
    const transferActor = await requirePermission('member.transfer', {
      club_id: before.club_id ?? null,
      district_id: before.district_id ?? null,
    });
    if (isGuardFailure(transferActor)) return transferActor;
    if (parsed.data.club_id) {
      const { data: target } = await supa
        .from('clubs').select('id, deleted_at').eq('id', parsed.data.club_id).maybeSingle();
      if (!target || target.deleted_at) {
        return NextResponse.json({ error: 'The target club does not exist or has been removed.' }, { status: 400 });
      }
    }
  }
  const { data, error } = await supa
    .from('members')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'member.update',
    entity: 'member',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    diff: { before, after: parsed.data as Record<string, unknown> },
  });

  return NextResponse.json({ member: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const before = await fetchMember(id);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('member.delete', {
    club_id: before.club_id ?? null,
    district_id: before.district_id ?? null,
  });
  if (isGuardFailure(actor)) return actor;

  const supa = memberDb() ?? await createClient();
  const { error } = await supa
    .from('members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'member.delete',
    entity: 'member',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { soft_delete: true },
  });

  return NextResponse.json({ ok: true });
}
