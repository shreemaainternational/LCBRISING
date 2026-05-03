import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  type Row = {
    id: string; expense_no: number; expense_date: string; amount: number;
    status: string; category: string | null; description: string | null;
    accounts: { code: string; name: string } | null;
    vendors: { name: string } | null;
  };
  let rows: Row[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('expenses')
      .select('id, expense_no, expense_date, amount, status, category, description, accounts:expense_account_id(code, name), vendors(name)')
      .order('expense_date', { ascending: false }).limit(200);
    rows = (data ?? []) as unknown as Row[];
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Expenses</h1>
      <p className="text-gray-600 mb-8">Submit, approve, pay. Approved expenses auto-post journal entries.</p>

      <Card>
        <CardHeader><CardTitle>{rows.length} records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3">Account</th>
                <th className="text-left p-3">Vendor</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3">#{e.expense_no}</td>
                  <td className="p-3">{e.expense_date}</td>
                  <td className="p-3">
                    <div>{e.description ?? '—'}</div>
                    <div className="text-xs text-gray-500">{e.category ?? ''}</div>
                  </td>
                  <td className="p-3">{e.accounts ? `${e.accounts.code} · ${e.accounts.name}` : '—'}</td>
                  <td className="p-3">{e.vendors?.name ?? '—'}</td>
                  <td className="p-3 text-right">{formatINR(Number(e.amount))}</td>
                  <td className="p-3">
                    <Badge variant={
                      e.status === 'paid' ? 'success'
                      : e.status === 'approved' ? 'success'
                      : e.status === 'rejected' ? 'danger'
                      : e.status === 'submitted' ? 'warning'
                      : 'secondary'
                    }>{e.status}</Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500">No expenses yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
