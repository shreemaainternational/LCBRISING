import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { ExportCsvButton } from '@/components/admin/ExportCsvButton';
import { donationsPreset } from '@/components/admin/quick-add-presets';
import { HeartHandshake } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DonationsPage() {
  const supabase = await createClient();
  const { data: donations } = await supabase
    .from('donations')
    .select('*, payments(status, razorpay_payment_id)')
    .order('created_at', { ascending: false }).limit(200);

  const total = (donations ?? []).reduce((s, d) => s + Number(d.amount), 0);
  const preset = donationsPreset();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Donations</h1>
          <p className="text-gray-600">Total raised: <strong>{formatINR(total)}</strong></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {!!donations?.length && (
            <ExportCsvButton
              rows={donations}
              filename="donations"
              columns={[
                { key: 'donor_name', label: 'Donor', get: (d) => (d.is_anonymous ? 'Anonymous' : d.donor_name) },
                { key: 'donor_email', label: 'Email' },
                { key: 'donor_phone', label: 'Phone' },
                { key: 'campaign', label: 'Campaign' },
                { key: 'amount', label: 'Amount' },
                { key: 'receipt_no', label: 'Receipt' },
                { key: 'created_at', label: 'Date' },
              ]}
            />
          )}
          <QuickAddCard title="Offline Donation" {...preset} />
        </div>
      </div>

      {!donations?.length ? (
        <EmptyState
          icon={<HeartHandshake size={26} />}
          title="No donations yet"
          description="Record cheque / cash / bank-transfer donations here. Online donations land automatically via Razorpay & PhonePe webhooks."
          cta={<QuickAddCard title="Offline Donation" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{donations.length} records</CardTitle></CardHeader>
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
                {donations.map((d) => (
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
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
