import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(1).max(120),
  district_id: z.string().uuid().optional(),
  region_id: z.string().uuid().optional(),
  zone_chairperson_name: z.string().max(200).optional(),
});

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { data, error } = await createAdminClient()
    .from('zones').select('*').is('deleted_at', null).order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zones: data ?? [] });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const payload = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== ''));
  const { data, error } = await createAdminClient()
    .from('zones').insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zone: data }, { status: 201 });
}
