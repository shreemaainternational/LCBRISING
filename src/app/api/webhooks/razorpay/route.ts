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
    const payload = event.payload as { payment: { entity: { id: string; order_id: string; status: string; amount: number; currency: string } } };
    const p = payload.payment.entity;
    const newStatus = p.status === 'captured' ? 'captured' : 'authorized';

    // Load the record first so we can (a) verify the amount and (b) make
    // this handler idempotent — gateways redeliver the same event and we
    // must not re-enqueue receipts or double-credit invoices/commissions.
    const { data: record } = await supabase
      .from('payments')
      .select('id, status, amount, currency, donation_id, dues_id, invoice_id, receipt_no, invoices(invoice_no, customer_name, customer_email, customer_phone, status)')
      .eq('razorpay_order_id', p.order_id)
      .maybeSingle();

    // Unknown order, or already captured — acknowledge and stop.
    if (!record || record.status === 'captured') {
      return NextResponse.json({ ok: true });
    }

    // The signed webhook amount must match what we expected for this
    // order. A mismatch is logged and never settled.
    const expectedPaise = Math.round(Number(record.amount) * 100);
    const currencyOk = String(p.currency ?? 'INR').toUpperCase() === String(record.currency ?? 'INR').toUpperCase();
    if (Number(p.amount) !== expectedPaise || !currencyOk) {
      await supabase.from('payment_audit_logs').insert({
        actor_kind: 'system',
        action: 'razorpay_webhook_amount_mismatch',
        detail: { order_id: p.order_id, expected_paise: expectedPaise, gateway_paise: Number(p.amount), gateway_currency: p.currency },
      });
      return NextResponse.json({ ok: true });
    }

    // Transition only from a non-captured state; the guard makes the
    // update itself the idempotency latch.
    const { data: payment } = await supabase
      .from('payments')
      .update({ status: newStatus, razorpay_payment_id: p.id, raw_event: event as unknown })
      .eq('id', record.id)
      .neq('status', 'captured')
      .select('id')
      .maybeSingle();
    if (!payment) {
      // Lost the race to another delivery — it already settled.
      return NextResponse.json({ ok: true });
    }

    // Money-moving side effects fire only on capture, exactly once.
    if (newStatus === 'captured') {
      if (record.donation_id) {
        await enqueueJob('send_donation_receipt', { donation_id: record.donation_id });
      }
      if (record.dues_id) {
        await supabase.from('dues').update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', record.dues_id);
      }
      if (record.invoice_id) {
        type WithInv = typeof record & {
          invoices: { invoice_no: string; customer_name: string; customer_email: string | null; customer_phone: string | null; status: string } | null;
        };
        const inv = (record as WithInv).invoices;
        if (inv && inv.status !== 'paid') {
          await markInvoicePaid(record.invoice_id, record.id);
          await sendPaymentConfirmation({
            invoiceId: record.invoice_id,
            invoiceNo: inv.invoice_no,
            customerName: inv.customer_name,
            customerEmail: inv.customer_email,
            customerPhone: inv.customer_phone,
            amount: Number(record.amount),
            receiptNo: record.receipt_no ?? `RZP-${p.id.slice(-8)}`,
            paymentId: record.id,
          });
        }
      }
    }
  } else if (event.event === 'payment.failed') {
    const payload = event.payload as { payment: { entity: { id: string; order_id: string } } };
    const p = payload.payment.entity;
    await supabase.from('payments')
      .update({ status: 'failed', razorpay_payment_id: p.id, raw_event: event as unknown })
      .eq('razorpay_order_id', p.order_id)
      .neq('status', 'captured');
  }

  return NextResponse.json({ ok: true });
}
