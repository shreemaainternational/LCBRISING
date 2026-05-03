import { createAdminClient } from '@/lib/supabase/server';

export interface JournalLine {
  account_id?: string;          // accept either id or code
  account_code?: string;
  debit?: number;
  credit?: number;
  memo?: string;
}

export interface PostJournalInput {
  date?: string;                // ISO date (YYYY-MM-DD)
  description: string;
  reference_type?: 'donation' | 'payment' | 'expense' | 'manual' | 'reversal';
  reference_id?: string;
  posted_by?: string | null;    // member id
  lines: JournalLine[];
  status?: 'draft' | 'posted';
}

export interface PostedJournal {
  id: string;
  entry_no: number;
  total_amount: number;
}

/**
 * Post a balanced journal entry.
 *
 * - Validates that sum(debit) === sum(credit) and that every line has
 *   exactly one of debit/credit (>0).
 * - Resolves account_code → account_id automatically.
 * - The DB-side deferred trigger re-validates the balance at commit.
 */
export async function postJournal(input: PostJournalInput): Promise<PostedJournal> {
  if (!input.lines.length) throw new Error('Journal must have at least one line');

  const supabase = createAdminClient();

  // 1. Resolve account codes
  const codes = input.lines
    .filter((l) => !l.account_id && l.account_code)
    .map((l) => l.account_code!);
  let codeToId: Record<string, string> = {};
  if (codes.length) {
    const { data: rows } = await supabase
      .from('accounts').select('id, code').in('code', codes);
    codeToId = Object.fromEntries((rows ?? []).map((r) => [r.code, r.id]));
    const missing = codes.filter((c) => !codeToId[c]);
    if (missing.length) throw new Error(`Unknown account code(s): ${missing.join(', ')}`);
  }

  // 2. Normalise + validate
  let totalDebit = 0;
  let totalCredit = 0;
  const normalised = input.lines.map((l) => {
    const account_id = l.account_id ?? codeToId[l.account_code!];
    if (!account_id) throw new Error('Each line needs account_id or account_code');
    const debit = round2(l.debit ?? 0);
    const credit = round2(l.credit ?? 0);
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      throw new Error('Each line needs exactly one of debit or credit (>0)');
    }
    totalDebit += debit;
    totalCredit += credit;
    return { account_id, debit, credit, memo: l.memo ?? null };
  });

  if (round2(totalDebit) !== round2(totalCredit)) {
    throw new Error(
      `Journal unbalanced: debit=${totalDebit.toFixed(2)} credit=${totalCredit.toFixed(2)}`,
    );
  }

  const entryDate = input.date ?? new Date().toISOString().slice(0, 10);

  // 3. Resolve fiscal period (best-effort)
  const { data: period } = await supabase
    .from('fiscal_periods').select('id')
    .lte('start_date', entryDate).gte('end_date', entryDate)
    .maybeSingle();

  // 4. Insert header + lines (atomic via PostgREST batch)
  const { data: header, error: hErr } = await supabase
    .from('journal_entries')
    .insert({
      entry_date: entryDate,
      description: input.description,
      reference_type: input.reference_type,
      reference_id: input.reference_id,
      status: input.status ?? 'posted',
      fiscal_period_id: period?.id ?? null,
      posted_by: input.posted_by ?? null,
    })
    .select('id, entry_no')
    .single();
  if (hErr || !header) throw new Error(hErr?.message ?? 'Journal insert failed');

  const lineRows = normalised.map((l) => ({ ...l, journal_id: header.id }));
  const { error: lErr } = await supabase.from('journal_lines').insert(lineRows);
  if (lErr) {
    // rollback header on line failure
    await supabase.from('journal_entries').delete().eq('id', header.id);
    throw new Error(lErr.message);
  }

  return { id: header.id, entry_no: header.entry_no, total_amount: totalDebit };
}

/**
 * Post a reversing journal that backs out an existing entry.
 */
export async function reverseJournal(originalId: string, reason: string): Promise<PostedJournal> {
  const supabase = createAdminClient();
  const { data: orig } = await supabase
    .from('journal_entries').select('id, status').eq('id', originalId).maybeSingle();
  if (!orig) throw new Error('Original journal not found');
  if (orig.status === 'reversed') throw new Error('Already reversed');

  const { data: lines } = await supabase
    .from('journal_lines').select('account_id, debit, credit').eq('journal_id', originalId);
  if (!lines?.length) throw new Error('No lines to reverse');

  const reversed = await postJournal({
    description: `Reversal of #${originalId}: ${reason}`,
    reference_type: 'reversal',
    reference_id: originalId,
    lines: lines.map((l) => ({
      account_id: l.account_id,
      debit: Number(l.credit),
      credit: Number(l.debit),
    })),
  });

  await supabase.from('journal_entries')
    .update({ status: 'reversed', reversed_by: reversed.id })
    .eq('id', originalId);

  return reversed;
}

function round2(n: number) { return Math.round(n * 100) / 100; }
