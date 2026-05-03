import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: header }, { data: lines }] = await Promise.all([
    supabase.from('journal_entries').select('*').eq('id', id).maybeSingle(),
    supabase.from('journal_lines')
      .select('id, debit, credit, memo, accounts(code, name, type)')
      .eq('journal_id', id),
  ]);
  if (!header) notFound();

  type Line = { id: string; debit: number; credit: number; memo: string | null;
    accounts: { code: string; name: string; type: string } | null };
  const ls = (lines ?? []) as unknown as Line[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy-800">Journal #{header.entry_no}</h1>
        <p className="text-gray-600">{header.entry_date} · {header.description}</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Entry</CardTitle>
          <Badge variant={header.status === 'posted' ? 'success' : header.status === 'reversed' ? 'warning' : 'secondary'}>
            {header.status}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Account</th>
                <th className="text-right p-3">Debit</th>
                <th className="text-right p-3">Credit</th>
                <th className="text-left p-3">Memo</th>
              </tr>
            </thead>
            <tbody>
              {ls.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{l.accounts?.code} · {l.accounts?.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{l.accounts?.type}</div>
                  </td>
                  <td className="p-3 text-right">{Number(l.debit) > 0 ? formatINR(Number(l.debit)) : ''}</td>
                  <td className="p-3 text-right">{Number(l.credit) > 0 ? formatINR(Number(l.credit)) : ''}</td>
                  <td className="p-3 text-gray-500">{l.memo ?? ''}</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-3 text-right">Totals</td>
                <td className="p-3 text-right">{formatINR(ls.reduce((s, l) => s + Number(l.debit), 0))}</td>
                <td className="p-3 text-right">{formatINR(ls.reduce((s, l) => s + Number(l.credit), 0))}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
