import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/env';
import { getProfitLoss } from '@/lib/accounting/reports';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PLPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from ?? `${today.slice(0,4)}-04-01`;
  const to = sp.to ?? today;

  if (!isSupabaseConfigured()) return <p>Supabase not configured.</p>;
  const r = await getProfitLoss({ from, to });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Profit & Loss</h1>
          <p className="text-gray-600">{r.range.from} → {r.range.to}</p>
        </div>
        <a href={`/api/accounting/reports/profit-loss?from=${from}&to=${to}&format=csv`}
           className="px-4 py-2 rounded-md border text-sm hover:bg-gray-50">
          Export CSV
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Income</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Section rows={r.income} total={r.total_income} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Section rows={r.expenses} total={r.total_expenses} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="text-lg font-semibold">Net Surplus / (Deficit)</div>
          <div className={`text-2xl font-bold ${r.net_surplus >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatINR(r.net_surplus)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ rows, total }: { rows: { code: string; name: string; balance: number }[]; total: number }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.code} className="border-t">
            <td className="p-3 font-mono text-xs text-gray-500 w-16">{r.code}</td>
            <td className="p-3">{r.name}</td>
            <td className="p-3 text-right">{formatINR(r.balance)}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={3} className="p-3 text-center text-gray-400">No activity</td></tr>
        )}
        <tr className="border-t bg-gray-50 font-semibold">
          <td colSpan={2} className="p-3 text-right">Total</td>
          <td className="p-3 text-right">{formatINR(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}
