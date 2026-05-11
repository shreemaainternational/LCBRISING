import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  customer_name: z.string().min(2),
  customer_email: z.string().email().optional().nullable(),
  customer_phone: z.string().optional().nullable(),
  amount: z.number().positive(),
  description: z.string().max(500).optional().nullable(),
  interval: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  next_run_at: z.string(),
  end_at: z.string().optional().nullable(),
  send_whatsapp: z.boolean().default(true),
  send_email: z.boolean().default(true),
});

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'unauthorised' }, { status: 401 }); }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('recurring_invoices')
    .select('*')
    .order('next_run_at', { ascending: true });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: Request) {
  let member;
  try { member = await requireAdmin(); } catch { return NextResponse.json({ error: 'unauthorised' }, { status: 401 }); }
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('recurring_invoices')
    .insert({ ...parsed.data, created_by: member.id })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data!.id });
}
