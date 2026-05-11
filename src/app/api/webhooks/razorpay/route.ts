import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { createAdminClient } from '@/lib/supabase/server';
import { enqueueJob } from '@/lib/automation/engine';
import { markInvoicePaid } from '@/lib/invoices';
import { sendPaymentConfirmation } from '@/lib/payment-notify';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(raw) as { event: string; payload: Record<string, unknown> };
  const supabase = createAdminClient();

  if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
    const payload = event.payload as { payment: { entity: { id: string; order_id: string; status: string } } };
    const p = payload.payment.entity;
    const { data: payment } = await supabase
      .from('payments')
      .update({
        status: p.status === 'captured' ? 'captured' : 'authorized',
        razorpay_payment_id: p.id,
        raw_event: event as unknown,
      })
      .eq('razorpay_order_id', p.order_id)
      .select('id, donation_id, dues_id, invoice_id, amount, receipt_no, invoices(invoice_no, customer_name, customer_email, customer_phone, status)')
      .maybeSingle();

    if (payment?.donation_id) {
      await enqueueJob('send_donation_receipt', { donation_id: payment.donation_id });
    }
    if (payment?.dues_id) {
      await supabase.from('dues').update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', payment.dues_id);
    }
    if (payment?.invoice_id) {
      type WithInv = typeof payment & {
        invoices: { invoice_no: string; customer_name: string; customer_email: string | null; customer_phone: string | null; status: string } | null;
      };
      const inv = (payment as WithInv).invoices;
      if (inv && inv.status !== 'paid') {
        await markInvoicePaid(payment.invoice_id, payment.id);
        await sendPaymentConfirmation({
          invoiceId: payment.invoice_id,
          invoiceNo: inv.invoice_no,
          customerName: inv.customer_name,
          customerEmail: inv.customer_email,
          customerPhone: inv.customer_phone,
          amount: Number(payment.amount),
          receiptNo: payment.receipt_no ?? `RZP-${p.id.slice(-8)}`,
          paymentId: payment.id,
        });
      }
    }
  } else if (event.event === 'payment.failed') {
    const payload = event.payload as { payment: { entity: { id: string; order_id: string } } };
    const p = payload.payment.entity;
    await supabase.from('payments')
      .update({ status: 'failed', razorpay_payment_id: p.id, raw_event: event as unknown })
      .eq('razorpay_order_id', p.order_id);
  }

  return NextResponse.json({ ok: true });
}
