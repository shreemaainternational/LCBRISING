import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getProfitLoss, getBalanceSheet } from '@/lib/accounting/reports';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AccountingDashboard() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-2">Accounting</h1>
        <p className="text-gray-600">Connect Supabase + run migration 0003 to enable.</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const fyStart = `${today.slice(0,4)}-04-01`;
  const supabase = await createClient();

  const [pl, bs, recentJournals] = await Promise.all([
    getProfitLoss({ from: fyStart, to: today }).catch(() => null),
    getBalanceSheet(today).catch(() => null),
    supabase.from('journal_entries')
      .select('id, entry_no, entry_date, description, total_amount, status, reference_type')
      .order('entry_no', { ascending: false }).limit(10),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Accounting</h1>
      <p className="text-gray-600 mb-8">FY {fyStart.slice(0,4)}–{Number(fyStart.slice(0,4))+1} · double-entry, audit-logged.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Income (FYTD)"   value={pl ? formatINR(pl.total_income) : '—'} tone="green" />
        <Stat label="Expenses (FYTD)" value={pl ? formatINR(pl.total_expenses) : '—'} tone="amber" />
        <Stat label="Net Surplus"     value={pl ? formatINR(pl.net_surplus) : '—'} tone={pl && pl.net_surplus >= 0 ? 'green' : 'red'} />
        <Stat label="Net Assets"      value={bs ? formatINR(bs.total_assets - bs.total_liabilities) : '—'} tone="blue" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <ReportLink href="/admin/accounting/reports/profit-loss" title="Profit & Loss" subtitle="Income vs expenses for any range" />
        <ReportLink href="/admin/accounting/reports/balance-sheet" title="Balance Sheet" subtitle="Assets, liabilities, equity at a point in time" />
        <ReportLink href="/admin/accounting/reports/trial-balance" title="Trial Balance" subtitle="All account balances — proves the books are balanced" />
        <ReportLink href="/admin/accounting/reports/cash-flow" title="Cash Flow" subtitle="Movement in cash + bank accounts" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <NavLink href="/admin/accounting/journal"  title="Journal" />
        <NavLink href="/admin/accounting/expenses" title="Expenses" />
        <NavLink href="/admin/accounting/accounts" title="Chart of Accounts" />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent journal entries</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3">Ref</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(recentJournals.data ?? []).map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="p-3">#{j.entry_no}</td>
                  <td className="p-3">{j.entry_date}</td>
                  <td className="p-3">
                    <Link href={`/admin/accounting/journal/${j.id}`} className="text-navy-700 hover:underline">
                      {j.description}
                    </Link>
                  </td>
                  <td className="p-3 text-xs text-gray-500">{j.reference_type ?? '—'}</td>
                  <td className="p-3 text-right">{formatINR(Number(j.total_amount))}</td>
                  <td className="p-3">
                    <Badge variant={
                      j.status === 'posted' ? 'success'
                      : j.status === 'reversed' ? 'warning'
                      : 'secondary'
                    }>{j.status}</Badge>
                  </td>
                </tr>
              ))}
              {(!recentJournals.data || recentJournals.data.length === 0) && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No journal entries yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'red' | 'blue' }) {
  const colors = {
    green: 'text-green-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
    blue: 'text-navy-800',
  } as const;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-gray-500 tracking-wide">{label}</div>
        <div className={`text-xl font-bold ${colors[tone]}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ReportLink({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="block">
      <Card className="hover:border-brand-400 transition-colors">
        <CardContent className="p-4">
          <div className="font-semibold text-navy-800">{title} →</div>
          <div className="text-sm text-gray-500">{subtitle}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NavLink({ href, title }: { href: string; title: string }) {
  return (
    <Link href={href} className="block">
      <Card className="hover:border-brand-400 transition-colors">
        <CardContent className="p-4 font-semibold text-navy-800">{title} →</CardContent>
      </Card>
    </Link>
  );
}
