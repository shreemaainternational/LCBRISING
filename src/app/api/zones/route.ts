import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().max(32).optional(),
  district_id: z.string().uuid().optional(),
  region_id: z.string().uuid().optional(),
  // Both the new and the old prop names — quick-add preset uses
  // zone_chairperson_name but we map it to chairperson_name.
  chairperson_name: z.string().max(200).optional(),
  zone_chairperson_name: z.string().max(200).optional(),
});

function friendlyError(message: string): string {
  if (/invalid api key/i.test(message)) {
    return 'Database auth failed. Set SUPABASE_SERVICE_ROLE_KEY for your project — or apply migration 0037_federation_rls.sql so admin members can write via their own session.';
  }
  if (/row.level security/i.test(message)) {
    return 'Row-level security blocked the insert. Apply migration 0037_federation_rls.sql to allow admin members to manage zones.';
  }
  if (/duplicate key/i.test(message)) {
    return 'A zone with that code already exists in this district.';
  }
  if (/null value in column "district_id"/i.test(message)) {
    return 'Pick a district from the dropdown — zones must belong to a district.';
  }
  if (/null value in column "code"/i.test(message)) {
    return 'Zone code is required.';
  }
  return message;
}

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const supa = await createClient();
  const { data, error } = await supa.from('zones').select('*').is('deleted_at', null).order('name');
  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  return NextResponse.json({ zones: data ?? [] });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  // Merge synonymous chair-name fields into the canonical column.
  const chairName = parsed.data.chairperson_name ?? parsed.data.zone_chairperson_name;
  const payload: Record<string, unknown> = {
    name: parsed.data.name,
    code: parsed.data.code,
    district_id: parsed.data.district_id,
    region_id: parsed.data.region_id,
    chairperson_name: chairName,
  };
  for (const k of Object.keys(payload)) if (payload[k] == null || payload[k] === '') delete payload[k];

  // Auto-derive a code if the admin didn't supply one — zones.code is NOT NULL.
  if (!payload.code) {
    const base = String(parsed.data.name).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'ZONE';
    payload.code = `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  // Zones require a district per the federation schema. If the admin
  // didn't pick one, fall back to the first district we can see so
  // the "No zones yet" empty-state Quick Add stays one-click.
  if (!payload.district_id) {
    const supa0 = await createClient();
    const { data: d } = await supa0.from('districts').select('id').is('deleted_at', null).order('code').limit(1).maybeSingle();
    if (d?.id) payload.district_id = d.id;
    else return NextResponse.json({ error: 'No districts exist yet — create one at /admin/districts first.' }, { status: 400 });
  }

  // 1) Try the user's authenticated session first — RLS lets admin
  //    members write (migration 0037). No service-role key required.
  const supa = await createClient();
  const first = await supa.from('zones').insert(payload).select().single();
  if (!first.error && first.data) return NextResponse.json({ zone: first.data }, { status: 201 });

  const firstMsg = first.error?.message ?? '';
  const isAuthFail = /invalid api key|jwt/i.test(firstMsg) || /row.level security/i.test(firstMsg);

  // 2) Fall back to the admin client only when RLS/auth blocked us
  //    and a service role is configured.
  if (isAuthFail && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const second = await admin.from('zones').insert(payload).select().single();
      if (!second.error && second.data) return NextResponse.json({ zone: second.data }, { status: 201 });
      return NextResponse.json({ error: friendlyError(second.error?.message ?? 'unknown_error') }, { status: 500 });
    } catch (e) {
      return NextResponse.json({ error: friendlyError(String(e)) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: friendlyError(firstMsg || 'unknown_error') }, { status: 500 });
}
