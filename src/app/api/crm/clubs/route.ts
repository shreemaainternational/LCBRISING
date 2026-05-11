import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { clubSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const actor = await requirePermission('club.read');
  if (isGuardFailure(actor)) return actor;

  const districtId = req.nextUrl.searchParams.get('district_id');
  const zoneId = req.nextUrl.searchParams.get('zone_id');
  const q = req.nextUrl.searchParams.get('q');

  const supa = await createClient();
  let query = supa
    .from('clubs')
    .select('id, name, club_number, district_id, zone_id, region_id, district, city, state')
    .is('deleted_at', null)
    .order('name');
  if (districtId) query = query.eq('district_id', districtId);
  if (zoneId) query = query.eq('zone_id', zoneId);
  if (q) query = query.or(`name.ilike.%${q}%,club_number.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clubs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const parsed = clubSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('club.create', { district_id: parsed.data.district_id ?? null });
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();
  const { data, error } = await supa.from('clubs').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'club.create',
    entity: 'club',
    entity_id: data.id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { name: parsed.data.name },
  });
  return NextResponse.json({ club: data }, { status: 201 });
}
