import { NextResponse } from 'next/server';
import { postJournalSchema } from '@/lib/validation/schemas';
import { postJournal } from '@/lib/accounting/journal';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, getCurrentMember } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ journals: [] });
  const supabase = await createClient();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
  const { data, error } = await supabase
    .from('journal_entries')
    .select('id, entry_no, entry_date, description, reference_type, status, total_amount, created_at')
    .order('entry_no', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ journals: data });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => null);
  const parsed = postJournalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const me = await getCurrentMember();
    const journal = await postJournal({ ...parsed.data, posted_by: me?.id ?? null });
    return NextResponse.json({ journal }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'post failed' },
      { status: 400 },
    );
  }
}
