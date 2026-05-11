import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'unauthorised' }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json().catch(() => null) as { active?: boolean } | null;
  if (!body || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'active flag required' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('recurring_invoices')
    .update({ active: body.active })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'unauthorised' }, { status: 401 }); }
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('recurring_invoices').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
