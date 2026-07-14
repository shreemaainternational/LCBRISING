import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { beneficiarySchema } from '@/lib/validation/beneficiary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/beneficiaries?q=&city=&gender=&followUps=&limit= */
export async function GET(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const city = url.searchParams.get('city');
  const gender = url.searchParams.get('gender');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);

  const db = createAdminClient();
  let query = db.from('beneficiaries').select('*', { count: 'exact' }).is('deleted_at', null);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  if (city) query = query.eq('city', city);
  if (gender) query = query.eq('gender', gender);
  query = query.order('last_service_date', { ascending: false, nullsFirst: false }).limit(limit);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ beneficiaries: data ?? [], total: count ?? 0 });
}

/** POST /api/beneficiaries */
export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const body = await req.json().catch(() => null);
  const parsed = beneficiarySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const clean = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== '' && v != null),
  );
  const { data, error } = await createAdminClient()
    .from('beneficiaries').insert(clean).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ beneficiary: data }, { status: 201 });
}
