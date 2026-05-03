import { NextResponse } from 'next/server';
import { getTrialBalance } from '@/lib/accounting/reports';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const url = new URL(req.url);
  const asOf = url.searchParams.get('as_of') ?? new Date().toISOString().slice(0, 10);
  const report = await getTrialBalance(asOf);
  return NextResponse.json(report);
}
