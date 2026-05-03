import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/env';
import { getTrialBalance } from '@/lib/accounting/reports';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TBPage({ searchParams }: { searchParams: Promise<{ as_of?: string }> }) {
  const sp = await searchParams;
  const asOf = sp.as_of ?? new Date().toISOString().slice(0, 10);
  if (!isSupabaseConfigured()) return <p>Supabase not configured.</p>;
  const r = await getTrialBalance(asOf);

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Trial Balance</h1>
      <p className="text-gray-600 mb-6">As of {r.as_of}</p>

      <Card>
        <CardHeader><CardTitle>{r.items.length} accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Type</th>
                <th className="text-right p-3">Debit</th>
                <th className="text-right p-3">Credit</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((i) => (
                <tr key={i.code} className="border-t">
                  <td className="p-3 font-mono text-xs text-gray-500">{i.code}</td>
                  <td className="p-3">{i.name}</td>
                  <td className="p-3 capitalize">{i.type}</td>
                  <td className="p-3 text-right">{i.debit > 0 ? formatINR(i.debit) : ''}</td>
                  <td className="p-3 text-right">{i.credit > 0 ? formatINR(i.credit) : ''}</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-semibold">
                <td colSpan={3} className="p-3 text-right">Totals</td>
                <td className="p-3 text-right">{formatINR(r.total_debit)}</td>
                <td className="p-3 text-right">{formatINR(r.total_credit)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className={`mt-4 p-3 rounded ${r.balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        {r.balanced ? '✓ Books are balanced' : '⚠ Trial balance is OUT — investigate immediately'}
      </div>
    </div>
  );
}
