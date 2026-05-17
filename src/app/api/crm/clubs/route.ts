import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { clubSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function friendlyError(message: string): string {
  if (/invalid schema|schema.*not.*found/i.test(message)) {
    return 'Supabase rejected the request schema. The anon key is not allowed to access "public" — set SUPABASE_SERVICE_ROLE_KEY to enable the admin fallback, or add "public" to your project\'s Exposed Schemas under Database → API.';
  }
  if (/invalid api key/i.test(message)) {
    return 'Database auth failed. Check that NEXT_PUBLIC_SUPABASE_ANON_KEY belongs to the same project as NEXT_PUBLIC_SUPABASE_URL.';
  }
  if (/row.level security/i.test(message)) {
    return 'Row-level security blocked the insert. Apply migration 0037_federation_rls.sql or set SUPABASE_SERVICE_ROLE_KEY.';
  }
  if (/duplicate key/i.test(message)) {
    return 'A club with that LCI number already exists.';
  }
  if (/null value in column "district"/i.test(message)) {
    return 'District is required — pick one from the dropdown.';
  }
  return message;
}

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
  if (error) {
    // Schema/auth fallback for read too.
    if (/invalid schema|invalid api key/i.test(error.message) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        let q2 = admin
          .from('clubs')
          .select('id, name, club_number, district_id, zone_id, region_id, district, city, state')
          .is('deleted_at', null)
          .order('name');
        if (districtId) q2 = q2.eq('district_id', districtId);
        if (zoneId) q2 = q2.eq('zone_id', zoneId);
        if (q) q2 = q2.or(`name.ilike.%${q}%,club_number.ilike.%${q}%`);
        const second = await q2;
        if (!second.error) return NextResponse.json({ clubs: second.data ?? [] });
        return NextResponse.json({ error: friendlyError(second.error.message) }, { status: 500 });
      } catch (e) {
        return NextResponse.json({ error: friendlyError(String(e)) }, { status: 500 });
      }
    }
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  }
  return NextResponse.json({ clubs: data ?? [] });
}

export async function POST(req: NextRequest) {
  const parsed = clubSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const actor = await requirePermission('club.create', { district_id: parsed.data.district_id ?? null });
  if (isGuardFailure(actor)) return actor;

  // Build the payload — strip empty optional fields so Postgres uses
  // column defaults / NULL.
  const payload: Record<string, unknown> = { ...parsed.data };
  for (const k of Object.keys(payload)) if (payload[k] === '' || payload[k] == null) delete payload[k];

  // Backfill the legacy `clubs.district` NOT NULL text column from the
  // linked district's code when only district_id was supplied.
  async function backfillDistrict(client: ReturnType<typeof createAdminClient>) {
    if (!payload.district && payload.district_id) {
      const { data: d } = await client.from('districts').select('code')
        .eq('id', payload.district_id as string).maybeSingle();
      if (d?.code) payload.district = d.code;
    }
    if (!payload.district) payload.district = '3232 FI';
  }

  // 1) Try the user's SSR session first — RLS gates the insert.
  const supa = await createClient();
  try { await backfillDistrict(supa as unknown as ReturnType<typeof createAdminClient>); } catch { /* ignore */ }
  if (!payload.district) payload.district = '3232 FI';

  const first = await supa.from('clubs').insert(payload).select().single();
  if (!first.error && first.data) {
    await writeAudit({
      action: 'club.create', entity: 'club', entity_id: first.data.id,
      actor_user_id: actor.user_id, actor_member_id: actor.member_id ?? null,
      payload: { name: parsed.data.name },
    });
    return NextResponse.json({ club: first.data }, { status: 201 });
  }

  const firstMsg = first.error?.message ?? '';
  const isInfraFail = /invalid schema|invalid api key|jwt|row.level security/i.test(firstMsg);

  // 2) Fall back to the admin client when SSR fails for infra reasons
  //    and a service role is configured.
  if (isInfraFail && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      await backfillDistrict(admin);
      if (!payload.district) payload.district = '3232 FI';
      const second = await admin.from('clubs').insert(payload).select().single();
      if (!second.error && second.data) {
        await writeAudit({
          action: 'club.create', entity: 'club', entity_id: second.data.id,
          actor_user_id: actor.user_id, actor_member_id: actor.member_id ?? null,
          payload: { name: parsed.data.name, fallback: 'admin' },
        });
        return NextResponse.json({ club: second.data }, { status: 201 });
      }
      return NextResponse.json({ error: friendlyError(second.error?.message ?? 'unknown_error') }, { status: 500 });
    } catch (e) {
      return NextResponse.json({ error: friendlyError(String(e)) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: friendlyError(firstMsg || 'unknown_error') }, { status: 500 });
}
