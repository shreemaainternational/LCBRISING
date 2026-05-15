import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils';
import { QuickAddCard } from '@/components/admin/QuickAddCard';

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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Donations</h1>
          <p className="text-gray-600">Total raised: <strong>{formatINR(total)}</strong></p>
        </div>
        <QuickAddCard
          title="Offline Donation"
          endpoint="/api/donations"
          accent="amber"
          description="Record a cheque, cash, or bank-transfer donation manually. Online donations are captured automatically via Razorpay webhooks."
          responseKey="donation"
          fields={[
            { name: 'donor_name',  label: 'Donor Name', type: 'text',  required: true },
            { name: 'amount',      label: 'Amount (₹)', type: 'number', required: true, min: 1, cast: 'number' },
            { name: 'donor_email', label: 'Email',     type: 'email' },
            { name: 'donor_phone', label: 'Phone',     type: 'tel' },
            { name: 'donor_pan',   label: 'PAN',       type: 'text', hint: 'For 80G receipts' },
            { name: 'campaign',    label: 'Campaign',  type: 'text', placeholder: 'e.g. Eye Camp 2026' },
            { name: 'is_anonymous', label: 'Anonymous donor', type: 'checkbox', cast: 'boolean' },
            { name: 'message',     label: 'Message',   type: 'textarea' },
          ]}
        />
      </div>

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
