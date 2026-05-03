import { NextResponse } from 'next/server';
import { getCashFlow } from '@/lib/accounting/reports';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const url = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get('from') ?? `${today.slice(0,4)}-04-01`;
  const to = url.searchParams.get('to') ?? today;
  const report = await getCashFlow({ from, to });
  return NextResponse.json(report);
}
