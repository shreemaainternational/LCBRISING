import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAdminPage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils';
import { CommissionActions } from './CommissionActions';

export const dynamic = 'force-dynamic';

export default async function CommissionsPage() {
  await requireAdminPage();
  const supabase = createAdminClient();

  const { data: records } = await supabase
    .from('commission_records')
    .select('id, base_amount, rate, commission_amount, status, paid_at, paid_utr, created_at, agent_id, invoice_id, members(name), invoices(invoice_no, customer_name)')
    .order('created_at', { ascending: false })
    .limit(500);

  type Row = {
    id: string;
    base_amount: number;
    rate: number;
    commission_amount: number;
    status: 'pending' | 'paid' | 'cancelled';
    paid_at: string | null;
    paid_utr: string | null;
    created_at: string;
    agent_id: string;
    invoice_id: string;
    members: { name: string } | null;
    invoices: { invoice_no: string; customer_name: string } | null;
  };
  const rows = (records ?? []) as unknown as Row[];

  const byAgent = new Map<string, { name: string; pending: number; paid: number }>();
  for (const r of rows) {
    const k = r.agent_id;
    const agg = byAgent.get(k) ?? { name: r.members?.name ?? '—', pending: 0, paid: 0 };
    if (r.status === 'pending') agg.pending += Number(r.commission_amount);
    else if (r.status === 'paid') agg.paid += Number(r.commission_amount);
    byAgent.set(k, agg);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Agent commissions</h1>
      <p className="text-gray-600 mb-6">
        Track and mark agent payouts. Commissions are auto-generated on invoice paid.
      </p>

      {byAgent.size > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>By agent</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Agent</th>
                  <th className="text-right p-2">Pending</th>
                  <th className="text-right p-2">Paid</th>
                </tr>
              </thead>
              <tbody>
                {[...byAgent.entries()].map(([k, agg]) => (
                  <tr key={k} className="border-t">
                    <td className="p-2">{agg.name}</td>
                    <td className="p-2 text-right text-amber-700 font-semibold">{formatINR(agg.pending)}</td>
                    <td className="p-2 text-right text-green-700 font-semibold">{formatINR(agg.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All commission records</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Agent</th>
                <th className="text-left p-3">Invoice</th>
                <th className="text-right p-3">Base</th>
                <th className="text-right p-3">Rate</th>
                <th className="text-right p-3">Commission</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Paid UTR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 text-gray-500">{formatDate(r.created_at)}</td>
                  <td className="p-3">{r.members?.name ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{r.invoices?.invoice_no ?? '—'}</td>
                  <td className="p-3 text-right">{formatINR(Number(r.base_amount))}</td>
                  <td className="p-3 text-right">{r.rate}%</td>
                  <td className="p-3 text-right font-semibold">{formatINR(Number(r.commission_amount))}</td>
                  <td className="p-3">{r.status}</td>
                  <td className="p-3 font-mono text-xs">{r.paid_utr ?? '—'}</td>
                  <td className="p-3">
                    {r.status === 'pending' && <CommissionActions id={r.id} />}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-gray-500">No commission records yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
