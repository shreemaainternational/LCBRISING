import { NextResponse } from 'next/server';
import { getAccountLedger } from '@/lib/accounting/reports';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { accountId } = await params;
  const url = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get('from') ?? `${today.slice(0,4)}-04-01`;
  const to = url.searchParams.get('to') ?? today;
  const ledger = await getAccountLedger(accountId, { from, to });
  return NextResponse.json({ account_id: accountId, range: { from, to }, ledger });
}
