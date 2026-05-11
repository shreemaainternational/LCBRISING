import { notFound } from 'next/navigation';
import { getInvoiceById, invoiceUpi, isExpired } from '@/lib/invoices';
import { renderQrSvg } from '@/lib/qr';
import { buildPhonePeIntent, buildGpayIntent, buildPaytmIntent, getUpiConfig } from '@/lib/upi';
import { phonepeConfigured } from '@/lib/phonepe';
import { env } from '@/lib/env';
import { PaymentClient } from './PaymentClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) return { title: 'Invoice not found' };
  return {
    title: `Pay ₹${inv.amount} — Invoice ${inv.invoice_no}`,
    description: `Secure UPI payment for invoice ${inv.invoice_no}.`,
    robots: { index: false, follow: false },
  };
}

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) notFound();

  const cfg = getUpiConfig();
  const upi = invoiceUpi(inv);
  const phonepe = buildPhonePeIntent({
    amount: Number(inv.amount),
    invoiceNo: inv.invoice_no,
    note: inv.description ?? undefined,
  });
  const gpay = buildGpayIntent({
    amount: Number(inv.amount),
    invoiceNo: inv.invoice_no,
    note: inv.description ?? undefined,
  });
  const paytm = buildPaytmIntent({
    amount: Number(inv.amount),
    invoiceNo: inv.invoice_no,
    note: inv.description ?? undefined,
  });

  const qrSvg = upi ? await renderQrSvg(upi) : '';
  const staticQrUrl = env.NEXT_PUBLIC_STATIC_QR_URL ?? null;
  const expired = isExpired(inv) || inv.status === 'expired';
  const paid = inv.status === 'paid';
  const cancelled = inv.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0f3e] via-[#3b1a78] to-[#5b21b6] py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <header className="bg-gradient-to-r from-[#5f259f] to-[#7c3aed] text-white p-6 text-center">
            <div className="text-xs uppercase tracking-widest opacity-80">Pay via UPI</div>
            <div className="mt-2 text-3xl font-bold">
              ₹{Number(inv.amount).toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-sm opacity-90">Invoice #{inv.invoice_no}</div>
          </header>

          <div className="p-6">
            <div className="text-center mb-4">
              <div className="text-sm text-gray-500">Paying</div>
              <div className="font-semibold text-gray-900">{cfg.payeeName}</div>
              <div className="text-xs text-gray-500 mt-1">Customer: {inv.customer_name}</div>
            </div>

            {paid ? (
              <SuccessPanel invoiceNo={inv.invoice_no} amount={Number(inv.amount)} />
            ) : cancelled ? (
              <ErrorPanel title="Invoice cancelled" message="This invoice has been cancelled. Contact us for a new one." />
            ) : expired ? (
              <ErrorPanel title="Invoice expired" message="This payment window has closed. Please request a new invoice." />
            ) : !upi && !staticQrUrl ? (
              <ErrorPanel
                title="Payment temporarily unavailable"
                message="Our team has not finished configuring the UPI account on the server. Please try again later."
              />
            ) : (
              <PaymentClient
                invoiceId={inv.id}
                invoiceNo={inv.invoice_no}
                amount={Number(inv.amount)}
                upiString={upi}
                upiVpa={cfg.vpa}
                payeeName={cfg.payeeName}
                qrSvg={qrSvg}
                staticQrUrl={staticQrUrl}
                expiresAt={inv.expires_at}
                phonepeIntent={phonepe}
                gpayIntent={gpay}
                paytmIntent={paytm}
                description={inv.description}
                invoicePdfUrl={`/api/invoices/${inv.id}/pdf`}
                phonepePgAvailable={phonepeConfigured()}
              />
            )}
          </div>

          <footer className="border-t bg-gray-50 p-4 text-center text-xs text-gray-500">
            Secured by Lions Club of Baroda Rising Star · Do not refresh after payment until you submit proof.
          </footer>
        </div>
      </div>
    </div>
  );
}

function SuccessPanel({ invoiceNo, amount }: { invoiceNo: string; amount: number }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">
        ✓
      </div>
      <h2 className="mt-4 text-xl font-bold text-gray-900">Payment received</h2>
      <p className="mt-2 text-sm text-gray-600">
        Invoice {invoiceNo} for ₹{amount.toLocaleString('en-IN')} has been paid.
      </p>
      <p className="mt-2 text-xs text-gray-500">A receipt will be sent to your email and WhatsApp.</p>
    </div>
  );
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl">!</div>
      <h2 className="mt-4 text-xl font-bold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </div>
  );
}
