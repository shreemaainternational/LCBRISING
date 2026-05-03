import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reverseJournal } from '@/lib/accounting/journal';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: header }, { data: lines }] = await Promise.all([
    supabase.from('journal_entries').select('*').eq('id', id).single(),
    supabase.from('journal_lines')
      .select('id, debit, credit, memo, accounts(code, name, type)')
      .eq('journal_id', id),
  ]);
  if (!header) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ journal: header, lines });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { id } = await params;
  const url = new URL(req.url);
  const reason = url.searchParams.get('reason') ?? 'Voided by admin';
  try {
    const reversal = await reverseJournal(id, reason);
    return NextResponse.json({ reversal });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'reverse failed' },
      { status: 400 },
    );
  }
}
