import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { clubSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Trusted admin reads/writes (gated by requirePermission at each call site).
// Prefer the service-role client so queries bypass RLS on databases where the
// federation RLS migration has not been applied; fall back to the SSR session.
function clubDb() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
}

async function fetchClub(id: string) {
  const supa = clubDb() ?? await createClient();
  const { data } = await supa
    .from('clubs')
    .select('id, name, club_number, district_id, zone_id, region_id, district, city, state, country, charter_date')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  return data;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission('club.read');
  if (isGuardFailure(actor)) return actor;
  const club = await fetchClub(id);
  if (!club) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ club });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = clubSchema.partial().safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const before = await fetchClub(id);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('club.update', {
    district_id: (parsed.data.district_id ?? before.district_id) ?? null,
  });
  if (isGuardFailure(actor)) return actor;

  // Only patch fields the caller actually sent — blank optional fields become
  // NULL, but never overwrite the required text `district` column with ''.
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (k === 'district' && (v === '' || v == null)) continue;
    updates[k] = v === '' ? null : v;
  }

  const supa = clubDb() ?? await createClient();
  const { data, error } = await supa
    .from('clubs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'club.update',
    entity: 'club',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    diff: { before, after: updates },
  });

  return NextResponse.json({ club: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const before = await fetchClub(id);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('club.delete', { district_id: before.district_id ?? null });
  if (isGuardFailure(actor)) return actor;

  const supa = clubDb() ?? await createClient();
  const { error } = await supa
    .from('clubs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'club.delete',
    entity: 'club',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { soft_delete: true, name: before.name },
  });

  return NextResponse.json({ ok: true });
}
