import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { formatINR, formatDate } from '@/lib/utils';
import { ReviewControls } from './ReviewControls';
import { NewInvoiceCard } from './NewInvoiceCard';
import { SendInvoiceButton } from './SendInvoiceButton';

export const dynamic = 'force-dynamic';

type Proof = {
  id: string;
  status: 'pending' | 'verified' | 'rejected' | 'duplicate';
  method: 'screenshot' | 'utr' | 'phonepe_webhook' | 'razorpay' | 'manual';
  utr: string | null;
  upi_vpa: string | null;
  amount_claimed: number | null;
  screenshot_url: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  status: string;
  created_at: string;
  payment_proofs: Proof[];
};

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_no, customer_name, customer_email, customer_phone, amount, status, created_at, payment_proofs(id, status, method, utr, upi_vpa, amount_claimed, screenshot_url, notes, rejection_reason, created_at)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (invoices ?? []) as InvoiceRow[];
  const totalCollected = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);
  const pendingProofs = rows.flatMap((r) => r.payment_proofs.filter((p) => p.status === 'pending'));

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Payments</h1>
          <p className="text-gray-600">
            Collected so far: <strong>{formatINR(totalCollected)}</strong> ·{' '}
            <strong>{pendingProofs.length}</strong> proof(s) awaiting review
          </p>
        </div>
      </div>

      <NewInvoiceCard />

      {pendingProofs.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Pending verification ({pendingProofs.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rows.map((inv) =>
              inv.payment_proofs
                .filter((p) => p.status === 'pending')
                .map((p) => (
                  <div key={p.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">{inv.customer_name} · {formatINR(Number(inv.amount))}</div>
                      <div className="text-xs text-gray-500">
                        Invoice {inv.invoice_no} · submitted {formatDate(p.created_at, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-sm mt-1">
                        Method: <span className="font-mono">{p.method}</span>
                        {p.utr && <> · UTR: <span className="font-mono">{p.utr}</span></>}
                        {p.amount_claimed && <> · Claims: ₹{p.amount_claimed}</>}
                      </div>
                      {p.notes && <div className="text-xs text-gray-600 mt-1">Notes: {p.notes}</div>}
                      {p.screenshot_url && (
                        <a
                          href={`/api/payments/proof-image/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-purple-700 hover:underline"
                        >
                          View screenshot
                        </a>
                      )}
                    </div>
                    <ReviewControls proofId={p.id} />
                  </div>
                )),
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader><CardTitle>All invoices</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Invoice</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.invoice_no}</td>
                  <td className="p-3">
                    {r.customer_name}
                    <div className="text-xs text-gray-500">{r.customer_phone ?? r.customer_email ?? ''}</div>
                  </td>
                  <td className="p-3 text-right">{formatINR(Number(r.amount))}</td>
                  <td className="p-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="p-3 text-gray-500">{formatDate(r.created_at)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-3 text-xs">
                      <a href={`/pay/${r.id}`} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">Open</a>
                      <a href={`/api/invoices/${r.id}/pdf`} target="_blank" rel="noreferrer" className="text-gray-700 hover:underline">PDF</a>
                      {r.status !== 'paid' && r.status !== 'cancelled' && (
                        <SendInvoiceButton invoiceId={r.id} hasPhone={Boolean(r.customer_phone)} hasEmail={Boolean(r.customer_email)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    sent: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-700',
    expired: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-red-100 text-red-700',
    partial: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
