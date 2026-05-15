import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { duesPreset } from '@/components/admin/quick-add-presets';
import { Banknote } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DuesPage() {
  const supabase = await createClient();
  const [{ data: dues }, { data: members }] = await Promise.all([
    supabase.from('dues').select('*, members(name, email)').order('due_date', { ascending: false }),
    supabase.from('members').select('id, name, email').is('deleted_at', null).order('name').limit(500),
  ]);

  const preset = duesPreset({ members: members ?? [] });
  const hasMembers = !!members?.length;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Dues</h1>
          <p className="text-gray-600">Membership dues and collection status.</p>
        </div>
        {hasMembers && <QuickAddCard title="Dues Invoice" {...preset} />}
      </div>

      {!dues?.length ? (
        <EmptyState
          icon={<Banknote size={26} />}
          title="No dues records yet"
          description={hasMembers
            ? 'Raise a dues invoice against a member to get started.'
            : 'Add at least one member first — dues invoices link to members.'}
          cta={hasMembers
            ? <QuickAddCard title="Dues Invoice" {...preset} />
            : <a href="/admin/members" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold">Go to Members →</a>}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{dues.length} dues records</CardTitle></CardHeader>
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
                {dues.map((d) => {
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
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
