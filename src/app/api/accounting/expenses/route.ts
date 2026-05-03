import { NextResponse } from 'next/server';
import { expenseSchema } from '@/lib/validation/schemas';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getCurrentMember } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*, accounts:expense_account_id(code, name), vendors(name)')
    .order('expense_date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expenses: data });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 });
  }
  const me = await getCurrentMember();
  const supabase = await createClient();
  const { data, error } = await supabase.from('expenses').insert({
    ...parsed.data,
    submitted_by: me?.id ?? null,
    status: 'submitted',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expense: data }, { status: 201 });
}
