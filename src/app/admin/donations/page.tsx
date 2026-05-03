import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DonationsPage() {
  const supabase = await createClient();
  const { data: donations } = await supabase
    .from('donations')
    .select('*, payments(status, razorpay_payment_id)')
    .order('created_at', { ascending: false }).limit(200);

  const total = (donations ?? []).reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Donations</h1>
      <p className="text-gray-600 mb-8">Total raised: <strong>{formatINR(total)}</strong></p>

      <Card>
        <CardHeader><CardTitle>{donations?.length ?? 0} records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Donor</th>
                <th className="text-left p-3">Campaign</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Receipt</th>
                <th className="text-left p-3">Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(donations ?? []).map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.is_anonymous ? 'Anonymous' : d.donor_name}<div className="text-xs text-gray-500">{d.donor_email}</div></td>
                  <td className="p-3">{d.campaign ?? '—'}</td>
                  <td className="p-3 text-right">{formatINR(Number(d.amount))}</td>
                  <td className="p-3">{d.receipt_no ?? '—'}</td>
                  <td className="p-3 text-gray-500">{formatDate(d.created_at)}</td>
                  <td className="p-3">
                    <Link href={`/api/donations/${d.id}/receipt`} className="text-brand-600 hover:underline">PDF</Link>
                  </td>
                </tr>
              ))}
              {(!donations || donations.length === 0) && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No donations yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
