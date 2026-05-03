import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/env';
import { getBalanceSheet } from '@/lib/accounting/reports';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function BSPage({ searchParams }: { searchParams: Promise<{ as_of?: string }> }) {
  const sp = await searchParams;
  const asOf = sp.as_of ?? new Date().toISOString().slice(0, 10);
  if (!isSupabaseConfigured()) return <p>Supabase not configured.</p>;
  const r = await getBalanceSheet(asOf);

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Balance Sheet</h1>
      <p className="text-gray-600 mb-6">As of {r.as_of}</p>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent className="p-0">
            <List rows={r.assets} />
            <Total label="Total Assets" amount={r.total_assets} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Liabilities & Equity</CardTitle></CardHeader>
          <CardContent className="p-0">
            <h3 className="px-4 pt-3 text-xs uppercase text-gray-500">Liabilities</h3>
            <List rows={r.liabilities} />
            <Total label="Total Liabilities" amount={r.total_liabilities} />
            <h3 className="px-4 pt-3 text-xs uppercase text-gray-500">Equity</h3>
            <List rows={r.equity} />
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-t"><td className="p-3 font-mono text-xs text-gray-500 w-16"></td><td className="p-3 italic text-gray-600">Period Surplus / (Deficit)</td><td className="p-3 text-right">{formatINR(r.period_surplus)}</td></tr>
              </tbody>
            </table>
            <Total label="Total Equity" amount={r.total_equity} />
            <Total label="Total Liab. + Equity" amount={r.total_liabilities + r.total_equity} />
          </CardContent>
        </Card>
      </div>

      {!r.balanced && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
          ⚠ Balance sheet does not balance. Review trial balance.
        </div>
      )}
    </div>
  );
}

function List({ rows }: { rows: { code: string; name: string; balance: number }[] }) {
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
        {rows.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-gray-400">—</td></tr>}
      </tbody>
    </table>
  );
}
function Total({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-t font-semibold">
      <span>{label}</span><span>{formatINR(amount)}</span>
    </div>
  );
}
