import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { beneficiarySchema } from '@/lib/validation/beneficiary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const db = createAdminClient();
  const [{ data: bene, error }, { data: services }] = await Promise.all([
    db.from('beneficiaries').select('*').eq('id', id).is('deleted_at', null).single(),
    db.from('beneficiary_services').select('*, activities(id,title,date,category)').eq('beneficiary_id', id).order('service_date', { ascending: false }).limit(200),
  ]);
  if (error || !bene) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ beneficiary: bene, services: services ?? [] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = beneficiarySchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const clean = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== ''));
  const { data, error } = await createAdminClient()
    .from('beneficiaries').update(clean).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ beneficiary: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  // Soft delete — keep service history intact for audit + reporting.
  const { error } = await createAdminClient()
    .from('beneficiaries').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
