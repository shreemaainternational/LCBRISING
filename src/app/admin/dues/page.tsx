import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DuesPage() {
  const supabase = await createClient();
  const { data: dues } = await supabase
    .from('dues')
    .select('*, members(name, email)')
    .order('due_date', { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Dues</h1>
      <p className="text-gray-600 mb-8">Membership dues and collection status.</p>

      <Card>
        <CardHeader><CardTitle>{dues?.length ?? 0} dues records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Member</th>
                <th className="text-left p-3">Period</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Due date</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(dues ?? []).map((d) => {
                const m = (d as unknown as { members: { name: string; email: string } | null }).members;
                return (
                  <tr key={d.id} className="border-t">
                    <td className="p-3">{m?.name ?? '—'}<div className="text-xs text-gray-500">{m?.email}</div></td>
                    <td className="p-3">{d.period_label ?? '—'}</td>
                    <td className="p-3 text-right">{formatINR(Number(d.amount))}</td>
                    <td className="p-3">{formatDate(d.due_date)}</td>
                    <td className="p-3">
                      <Badge variant={d.status === 'paid' ? 'success' : d.status === 'overdue' ? 'danger' : 'warning'}>
                        {d.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {(!dues || dues.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No dues recorded</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
