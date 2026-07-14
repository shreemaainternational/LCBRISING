import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { beneficiaryServiceSchema } from '@/lib/validation/beneficiary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/beneficiaries/[id]/services — log a new service event */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = beneficiaryServiceSchema.safeParse({ ...body, beneficiary_id: id });
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();
  const insert = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== ''));
  const { data: svc, error } = await db.from('beneficiary_services').insert(insert).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Roll up beneficiary totals so list & reports stay accurate without
  // recomputing them on every read.
  const { data: agg } = await db.from('beneficiary_services')
    .select('value_provided, service_date')
    .eq('beneficiary_id', id);
  const total = (agg ?? []).reduce((a, b) => a + Number(b.value_provided ?? 0), 0);
  const count = (agg ?? []).length;
  const last = (agg ?? []).reduce<string | null>(
    (m, r) => (!m || new Date(r.service_date) > new Date(m)) ? r.service_date : m, null,
  );
  await db.from('beneficiaries').update({
    total_services_received: count,
    total_value_received: total,
    last_service_date: last,
  }).eq('id', id);

  return NextResponse.json({ service: svc }, { status: 201 });
}

/** DELETE /api/beneficiaries/[id]/services?serviceId=… */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const serviceId = url.searchParams.get('serviceId');
  if (!serviceId) return NextResponse.json({ error: 'missing_serviceId' }, { status: 400 });
  const db = createAdminClient();
  const { error } = await db.from('beneficiary_services').delete().eq('id', serviceId).eq('beneficiary_id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
