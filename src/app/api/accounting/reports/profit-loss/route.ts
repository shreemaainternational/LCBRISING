import { NextResponse } from 'next/server';
import { getProfitLoss } from '@/lib/accounting/reports';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const url = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get('from') ?? `${today.slice(0,4)}-04-01`;
  const to = url.searchParams.get('to') ?? today;
  const report = await getProfitLoss({ from, to });
  if (url.searchParams.get('format') === 'csv') return csv(report);
  return NextResponse.json(report);
}

function csv(r: Awaited<ReturnType<typeof getProfitLoss>>) {
  const rows: string[] = [
    `Profit & Loss,${r.range.from} to ${r.range.to}`,
    '',
    'Income', 'Code,Name,Amount',
    ...r.income.map((i) => `${i.code},${escape(i.name)},${i.balance.toFixed(2)}`),
    `,Total Income,${r.total_income.toFixed(2)}`,
    '',
    'Expenses', 'Code,Name,Amount',
    ...r.expenses.map((i) => `${i.code},${escape(i.name)},${i.balance.toFixed(2)}`),
    `,Total Expenses,${r.total_expenses.toFixed(2)}`,
    '',
    `Net Surplus,,${r.net_surplus.toFixed(2)}`,
  ];
  return new NextResponse(rows.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="profit-loss-${r.range.from}-${r.range.to}.csv"`,
    },
  });
}
function escape(s: string) { return s.includes(',') ? `"${s}"` : s; }
