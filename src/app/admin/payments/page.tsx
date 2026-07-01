import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { formatINR, formatDate } from '@/lib/utils';
import { getPaymentStats } from '@/lib/payment-stats';
import { ReviewControls } from './ReviewControls';
import { NewInvoiceCard } from './NewInvoiceCard';
import { BulkInvoiceCard } from './BulkInvoiceCard';
import { RecurringCard } from './RecurringCard';
import { SendInvoiceButton } from './SendInvoiceButton';
import { RefundButton } from './RefundButton';
import { CollectionsChart } from './PaymentCharts';

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

async function safe<T>(label: string, fn: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[admin/payments] ${label} failed:`, msg);
    return { data: null, error: msg };
  }
}

export default async function AdminPaymentsPage() {
  await requireAdminPage();
  const supabase = createAdminClient();

  const [invoicesResult, paymentsResult, refundsResult, statsResult] = await Promise.all([
    safe('invoices', async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_no, customer_name, customer_email, customer_phone, amount, status, created_at, payment_proofs(id, status, method, utr, upi_vpa, amount_claimed, screenshot_url, notes, rejection_reason, created_at)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    safe('payments', async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, receipt_no, status, method, utr, created_at, invoices(invoice_no, customer_name)')
        .in('status', ['captured', 'authorized'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    safe('refunds', async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select('id, amount, status, reason, utr, created_at, processed_at, payment_id, invoices(invoice_no, customer_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
    safe('stats', () => getPaymentStats()),
  ]);

  const errors = [invoicesResult, paymentsResult, refundsResult, statsResult]
    .map((r, i) => ({ label: ['invoices', 'payments', 'refunds', 'stats'][i], error: r.error }))
    .filter((r) => r.error);

  const invoices = invoicesResult.data ?? [];
  const capturedPayments = paymentsResult.data ?? [];
  const refunds = refundsResult.data ?? [];
  const stats = statsResult.data ?? {
    totalCollected: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0,
    expiredCount: 0, pendingProofs: 0, daily: [], topCustomers: [],
  };

  const rows = (invoices ?? []) as InvoiceRow[];
  const pendingProofs = rows.flatMap((r) => r.payment_proofs.filter((p) => p.status === 'pending'));
  const captured = (capturedPayments ?? []) as unknown as Array<{
    id: string;
    amount: number;
    receipt_no: string | null;
    status: string;
    method: string | null;
    utr: string | null;
    created_at: string;
    invoices: { invoice_no: string; customer_name: string } | null;
  }>;
  const refundRows = (refunds ?? []) as unknown as Array<{
    id: string;
    amount: number;
    status: string;
    reason: string | null;
    utr: string | null;
    created_at: string;
    processed_at: string | null;
    payment_id: string;
    invoices: { invoice_no: string; customer_name: string } | null;
  }>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Payments</h1>
          <p className="text-gray-600">
            Collected (30d): <strong>{formatINR(stats.totalCollected)}</strong> ·{' '}
            <strong>{pendingProofs.length}</strong> proof(s) awaiting review
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/payments/reconciliation"
            className="h-9 px-4 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 inline-flex items-center"
          >
            Reconciliation CSV
          </a>
          <a
            href="/api/payments/audit-log"
            className="h-9 px-4 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 inline-flex items-center"
          >
            Audit log CSV
          </a>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900 mb-1">
            Some data could not be loaded. The page is rendering with what succeeded.
          </p>
          <ul className="text-xs text-amber-800 space-y-0.5">
            {errors.map((e) => (
              <li key={e.label}>
                <strong>{e.label}:</strong> {e.error}
              </li>
            ))}
          </ul>
          <p className="text-xs text-amber-700 mt-2">
            If you just applied migrations, run <code className="bg-amber-100 px-1 rounded">NOTIFY pgrst, &apos;reload schema&apos;;</code> in the Supabase SQL Editor and refresh.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Collected (30d)" value={formatINR(stats.totalCollected)} accent="text-green-700" />
        <StatCard label="Pending amount" value={formatINR(stats.pendingAmount)} accent="text-amber-700" />
        <StatCard label="Paid invoices" value={String(stats.paidCount)} accent="text-purple-700" />
        <StatCard label="Awaiting proof" value={String(stats.pendingProofs)} accent="text-blue-700" />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Collections — last 30 days</CardTitle></CardHeader>
        <CardContent>
          <CollectionsChart data={stats.daily} />
        </CardContent>
      </Card>

      {stats.topCustomers.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Top customers (30d)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.topCustomers.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span>{c.name}</span>
                <span className="font-medium">{formatINR(c.total)} <span className="text-xs text-gray-500">· {c.count}x</span></span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NewInvoiceCard />
        <BulkInvoiceCard />
      </div>
      <div className="mt-6">
        <RecurringCard />
      </div>

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

      {captured.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Captured payments ({captured.length})</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Receipt</th>
                  <th className="text-left p-3">Invoice</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Method</th>
                  <th className="text-left p-3">UTR</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {captured.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{p.receipt_no ?? '—'}</td>
                    <td className="p-3 font-mono text-xs">{p.invoices?.invoice_no ?? '—'}</td>
                    <td className="p-3">{p.invoices?.customer_name ?? '—'}</td>
                    <td className="p-3 text-right">{formatINR(Number(p.amount))}</td>
                    <td className="p-3 text-xs">{p.method ?? '—'}</td>
                    <td className="p-3 font-mono text-xs">{p.utr ?? '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-3 text-xs">
                        <a href={`/api/payments/${p.id}/receipt`} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">Receipt</a>
                        <RefundButton paymentId={p.id} amount={Number(p.amount)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {refundRows.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Refunds ({refundRows.length})</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Invoice</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-right p-3">Refunded</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">UTR</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-left p-3">When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {refundRows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{r.invoices?.invoice_no ?? '—'}</td>
                    <td className="p-3">{r.invoices?.customer_name ?? '—'}</td>
                    <td className="p-3 text-right">{formatINR(Number(r.amount))}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 font-mono text-xs">{r.utr ?? '—'}</td>
                    <td className="p-3 text-xs">{r.reason ?? '—'}</td>
                    <td className="p-3 text-gray-500">{formatDate(r.processed_at ?? r.created_at)}</td>
                    <td className="p-3 text-xs">
                      {r.status === 'processed' && (
                        <a href={`/api/refunds/${r.id}/receipt`} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">PDF</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                      <a href={`/api/qr/${r.id}/card?format=pdf`} target="_blank" rel="noreferrer" className="text-gray-700 hover:underline">QR card</a>
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

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${accent}`}>{value}</div>
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
    refunded: 'bg-orange-100 text-orange-800',
    processed: 'bg-green-100 text-green-800',
    requested: 'bg-amber-100 text-amber-800',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
