import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { resolveDefaultDistrictCode } from '@/lib/default-district';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Trusted admin reads/writes (gated by requirePermission at each call site).
// Prefer the service-role client so writes bypass RLS on installs where the
// federation RLS policies aren't fully applied; fall back to the SSR session.
function clubDb() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
}

// Editable fields only — no zod defaults, so an omitted field is never
// coerced onto the row (a plain clubSchema.partial() would force
// country='India' / district='' on every edit).
const clubUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  club_number: z.string().max(64).nullable().optional(),
  district_id: z.string().uuid().nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  state: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  charter_date: z.string().max(40).nullable().optional(),
});

async function fetchClub(id: string) {
  const supa = clubDb() ?? await createClient();
  const { data } = await supa
    .from('clubs')
    .select('id, name, club_number, district, district_id, zone_id, region_id, city, state, country, charter_date')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  return data;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = clubUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const before = await fetchClub(id);
  if (!before) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const actor = await requirePermission('club.update', { district_id: before.district_id ?? null });
  if (isGuardFailure(actor)) return actor;

  // Only write the keys actually supplied.
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) payload[k] = v === '' ? null : v;
  }
  // Keep the legacy clubs.district text in sync when the district changes.
  if (typeof payload.district_id === 'string') {
    payload.district = await resolveDefaultDistrictCode(payload.district_id);
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ club: before });
  }

  const supa = clubDb() ?? await createClient();
  const { data, error } = await supa.from('clubs').update(payload).eq('id', id).select().single();
  if (error) {
    const msg = (error as { code?: string }).code === '23505'
      ? 'A club with that LCI number already exists.'
      : describeSupabaseError(error.message);
    return NextResponse.json({ error: msg }, { status: (error as { code?: string }).code === '23505' ? 409 : 500 });
  }

  await writeAudit({
    action: 'club.update',
    entity: 'club',
    entity_id: id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    diff: { before, after: payload },
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
