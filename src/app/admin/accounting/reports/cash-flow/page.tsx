import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/env';
import { getCashFlow } from '@/lib/accounting/reports';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CFPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const from = sp.from ?? `${today.slice(0,4)}-04-01`;
  const to = sp.to ?? today;

  if (!isSupabaseConfigured()) return <p>Supabase not configured.</p>;
  const r = await getCashFlow({ from, to });

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Cash Flow</h1>
      <p className="text-gray-600 mb-6">{r.range.from} → {r.range.to}</p>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Inflows ({r.operating_inflows.length})</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            <List rows={r.operating_inflows} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Outflows ({r.operating_outflows.length})</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            <List rows={r.operating_outflows} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="text-lg font-semibold">Net change in cash</div>
          <div className={`text-2xl font-bold ${r.net_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatINR(r.net_change)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function List({ rows }: { rows: { date: string; description: string; amount: number }[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.length === 0 ? (
          <tr><td className="p-3 text-center text-gray-400">No movement</td></tr>
        ) : rows.map((r, i) => (
          <tr key={i} className="border-t">
            <td className="p-3 text-xs text-gray-500 w-24">{r.date}</td>
            <td className="p-3">{r.description}</td>
            <td className="p-3 text-right">{formatINR(r.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
