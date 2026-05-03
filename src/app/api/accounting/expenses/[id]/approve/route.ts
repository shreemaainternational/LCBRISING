import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin, getCurrentMember } from '@/lib/auth';
import { enqueueJob } from '@/lib/automation/engine';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { id } = await params;
  const me = await getCurrentMember();
  const supabase = createAdminClient();

  const { data, error } = await supabase.from('expenses').update({
    status: 'approved',
    approved_by: me?.id ?? null,
    approved_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-post the journal asynchronously
  await enqueueJob('post_expense_approval_journal', { expense_id: id });
  return NextResponse.json({ expense: data });
}
