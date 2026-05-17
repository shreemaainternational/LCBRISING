import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { clubSchema } from '@/lib/validation/schemas';
import { writeAudit } from '@/lib/audit';
import { resolveOrBootstrapDefaultDistrict, resolveDefaultDistrictCode } from '@/lib/default-district';

export const dynamic = 'force-dynamic';

function friendlyError(message: string): string {
  if (/invalid schema|schema.*not.*found/i.test(message)) {
    return 'Supabase rejected the request schema. The anon key is not allowed to access "public" — set SUPABASE_SERVICE_ROLE_KEY to enable the admin fallback, or add "public" to your project\'s Exposed Schemas under Database → API.';
  }
  if (/invalid api key/i.test(message)) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'Database auth failed. Check that NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY both belong to the same project as NEXT_PUBLIC_SUPABASE_URL.'
      : 'Database auth failed and no SUPABASE_SERVICE_ROLE_KEY is configured to fall back to. Either sign in as an admin so RLS lets you write, or set SUPABASE_SERVICE_ROLE_KEY in your environment.';
  }
  if (/row.level security/i.test(message)) {
    return 'Row-level security blocked the insert. Apply migration 0037_federation_rls.sql or set SUPABASE_SERVICE_ROLE_KEY.';
  }
  if (/duplicate key/i.test(message)) {
    return 'A club with that LCI number already exists.';
  }
  if (/null value in column "district"/i.test(message)) {
    return 'District is required — pick one from the dropdown, or leave it blank to auto-create District 3232 FI.';
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

  // Pre-flight: detect the unhelpful "synthetic admin without service role"
  // combo (lcbr_crm cookie / ADMIN_AUTH_BYPASS but no SUPABASE_SERVICE_ROLE_KEY).
  // RLS would silently deny because auth.uid() is null. Fast-fail with a
  // message that actually unblocks the user.
  const SYNTHETIC_USER = '00000000-0000-0000-0000-000000000000';
  if (actor.user_id === SYNTHETIC_USER && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      error:
        'You are signed in via the diagnostic bypass (lcbr_crm cookie or ADMIN_AUTH_BYPASS=1) — ' +
        'Supabase has no real session for this request, so RLS will deny the insert. ' +
        'Set SUPABASE_SERVICE_ROLE_KEY in your environment, or sign in via /login with a real Supabase account.',
    }, { status: 401 });
  }

  // Build the payload — strip empty optional fields so Postgres uses
  // column defaults / NULL.
  const payload: Record<string, unknown> = { ...parsed.data };
  for (const k of Object.keys(payload)) if (payload[k] === '' || payload[k] == null) delete payload[k];

  // Self-bootstrap: when the form didn't supply a district_id (empty
  // dropdown on a fresh install), find or auto-create District 3232 FI
  // so the Quick Add stays one-click.
  if (!payload.district_id) {
    const resolved = await resolveOrBootstrapDefaultDistrict();
    if (resolved) payload.district_id = resolved;
  }

  // Legacy clubs.district text column is NOT NULL — derive its value
  // from the resolved district's code.
  if (!payload.district) {
    payload.district = await resolveDefaultDistrictCode(payload.district_id as string | undefined);
  }

  // 1) Try the user's SSR session first — RLS gates the insert.
  const supa = await createClient();

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
      if (!payload.district) {
        payload.district = await resolveDefaultDistrictCode(payload.district_id as string | undefined);
      }
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
