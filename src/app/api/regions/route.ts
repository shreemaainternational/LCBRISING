import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { resolveOrBootstrapDefaultDistrict, explainBootstrapFailure } from '@/lib/default-district';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().max(32).optional(),
  district_id: z.string().uuid().optional(),
  chairperson_name: z.string().max(200).optional(),
  region_chairperson_name: z.string().max(200).optional(),
});

function friendlyError(message: string): string {
  if (/duplicate key/i.test(message)) return 'A region with that code already exists in this district.';
  if (/null value in column "district_id"/i.test(message)) return 'Pick a district — regions must belong to a district.';
  if (/null value in column "code"/i.test(message)) return 'Region code is required.';
  if (/row.level security|new row violates|permission denied/i.test(message)) {
    return 'Row-level security blocked the insert. Set SUPABASE_SERVICE_ROLE_KEY, or sign in as an admin member.';
  }
  return message;
}

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data, error } = await supa.from('regions').select('*').is('deleted_at', null).order('code');
  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  return NextResponse.json({ regions: data ?? [] });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const chairName = parsed.data.chairperson_name ?? parsed.data.region_chairperson_name;
  const payload: Record<string, unknown> = {
    name: parsed.data.name,
    code: parsed.data.code,
    district_id: parsed.data.district_id,
    chairperson_name: chairName,
  };
  for (const k of Object.keys(payload)) if (payload[k] == null || payload[k] === '') delete payload[k];

  // regions.code is NOT NULL — derive it from the name (a number like "5" or a
  // short slug) when the admin didn't supply one.
  if (!payload.code) {
    const num = String(parsed.data.name).match(/\d+/)?.[0];
    payload.code = num ?? (String(parsed.data.name).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'REGION');
  }

  // Regions require a district — resolve or bootstrap the default (3232 F1).
  if (!payload.district_id) {
    const result = await resolveOrBootstrapDefaultDistrict();
    if (result.id) payload.district_id = result.id;
    else return NextResponse.json({ error: explainBootstrapFailure(result) }, { status: 500 });
  }

  // Admin-gated: write with the service-role client when configured so the
  // insert + read-back bypass RLS; fall back to the SSR session otherwise.
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data, error } = await supa.from('regions').insert(payload).select().single();
  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  return NextResponse.json({ region: data }, { status: 201 });
}
