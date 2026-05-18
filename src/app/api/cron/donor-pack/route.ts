import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { generateAndSendPacks, indianFiscalYearForCron } from '@/lib/donor-pack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/donor-pack?force=0
 *
 * Fires daily Apr 1-7 at 09:00 (see vercel.json). Generates one
 * consolidated 80G statement per donor for the fiscal year that just
 * ended, persists it to `donor_tax_packs`, and emails it as a PDF
 * attachment. Idempotent — the first day of the window sends the
 * packs, subsequent days skip donors whose pack was already sent
 * (unless `?force=1` is supplied). The 7-day window is a workaround
 * for Vercel cron rejecting expressions that combine day-of-month
 * and day-of-week ("first Sunday of April" cannot be expressed).
 */
export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const fy = indianFiscalYearForCron(new Date());

  const results = await generateAndSendPacks(fy, { force });
  return NextResponse.json({
    ok: true,
    fiscal_year: fy.label,
    period: { start: fy.start.toISOString(), end: fy.end.toISOString() },
    donors: results.length,
    sent: results.filter((r) => r.status === 'sent').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    no_email_provider: results.filter((r) => r.status === 'no_email_provider').length,
    results,
  });
}
