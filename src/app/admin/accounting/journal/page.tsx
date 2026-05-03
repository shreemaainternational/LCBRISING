import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function JournalListPage() {
  let journals: { id: string; entry_no: number; entry_date: string;
    description: string; reference_type: string | null; status: string;
    total_amount: number }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('journal_entries')
      .select('id, entry_no, entry_date, description, reference_type, status, total_amount')
      .order('entry_no', { ascending: false }).limit(200);
    journals = (data ?? []) as typeof journals;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Journal</h1>
          <p className="text-gray-600">All double-entry transactions, newest first.</p>
        </div>
        <Link href="/admin/accounting/journal/new" className="px-4 py-2 rounded-md bg-brand-500 text-navy-900 font-semibold">
          + New entry
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>{journals.length} entries</CardTitle></CardHeader>
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
              {journals.map((j) => (
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
              {journals.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No journal entries yet — donations and approved expenses will appear here automatically.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
