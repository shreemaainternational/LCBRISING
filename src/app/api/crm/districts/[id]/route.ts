import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { districtSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission('district.read');
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();
  const [districtRes, clubsRes, membersCountRes] = await Promise.all([
    supa.from('districts').select('*').eq('id', id).maybeSingle(),
    supa.from('clubs').select('id, name, club_number, zone_id, region_id').eq('district_id', id).is('deleted_at', null),
    supa.from('members').select('id', { count: 'exact', head: true }).eq('district_id', id).is('deleted_at', null),
  ]);

  if (!districtRes.data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    district: districtRes.data,
    clubs: clubsRes.data ?? [],
    member_count: membersCountRes.count ?? 0,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = districtSchema.partial().safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('district.update', { district_id: id });
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();
  const { data, error } = await supa
    .from('districts')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'district.update',
    entity: 'district',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    diff: { after: parsed.data as Record<string, unknown> },
  });

  return NextResponse.json({ district: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission('district.update', { district_id: id });
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();

  // Lions hierarchy (District → Region → Zone → Club → Member) never orphans
  // children: block removal while the district still holds any.
  const [clubs, zones, regions] = await Promise.all([
    supa.from('clubs').select('id', { count: 'exact', head: true }).eq('district_id', id).is('deleted_at', null),
    supa.from('zones').select('id', { count: 'exact', head: true }).eq('district_id', id).is('deleted_at', null),
    supa.from('regions').select('id', { count: 'exact', head: true }).eq('district_id', id).is('deleted_at', null),
  ]);
  const parts = [
    (clubs.count ?? 0) && `${clubs.count} club(s)`,
    (zones.count ?? 0) && `${zones.count} zone(s)`,
    (regions.count ?? 0) && `${regions.count} region(s)`,
  ].filter(Boolean);
  if (parts.length) {
    return NextResponse.json(
      { error: `Can't remove this district — it still has ${parts.join(', ')}. Move or remove them first.` },
      { status: 409 },
    );
  }

  const { error } = await supa
    .from('districts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'district.delete',
    entity: 'district',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { soft_delete: true },
  });

  return NextResponse.json({ ok: true });
}
