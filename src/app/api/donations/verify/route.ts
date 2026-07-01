import { NextResponse } from 'next/server';
import { paymentVerifySchema } from '@/lib/validation/schemas';
import { verifyCheckoutSignature, fetchPayment } from '@/lib/razorpay';
import { createAdminClient } from '@/lib/supabase/server';
import { enqueueJob } from '@/lib/automation/engine';

export const runtime = 'nodejs';

const SETTLEABLE = ['created', 'authorized'];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = paymentVerifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_record_id } = parsed.data;
  const supabase = createAdminClient();

  // Load the record we're about to settle up front, and bind every
  // subsequent check to it. Without this the caller could settle any
  // record id with a valid signature from an unrelated cheap order.
  const { data: record } = await supabase
    .from('payments')
    .select('id, amount, currency, status, razorpay_order_id, donation_id, dues_id, type, receipt_no')
    .eq('id', payment_record_id)
    .maybeSingle();
  if (!record) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  // Idempotent: already captured — never re-enqueue receipts.
  if (record.status === 'captured') {
    return NextResponse.json({ ok: true, receipt_no: record.receipt_no });
  }

  // The submitted order must be the exact order we created for THIS
  // record. This is what stops a signature from a different order
  // settling an expensive record.
  if (!record.razorpay_order_id || record.razorpay_order_id !== razorpay_order_id) {
    return NextResponse.json({ error: 'Order mismatch' }, { status: 400 });
  }

  // 1. Signature — proves the payment id belongs to the order id.
  const sigOk = verifyCheckoutSignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!sigOk) {
    await supabase.from('payments')
      .update({ status: 'failed', razorpay_payment_id, razorpay_signature })
      .eq('id', record.id)
      .in('status', SETTLEABLE);
    return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
  }

  // 2. Authoritative amount/status check against Razorpay itself.
  //    Never trust the amount that was quoted at intent time alone —
  //    confirm the gateway actually captured the expected paise for
  //    this order before marking anything paid.
  let gateway;
  try {
    gateway = await fetchPayment(razorpay_payment_id);
  } catch {
    return NextResponse.json({ error: 'Could not verify payment with gateway' }, { status: 502 });
  }
  const expectedPaise = Math.round(Number(record.amount) * 100);
  const gatewayPaise = Number(gateway.amount);
  const statusOk = gateway.status === 'captured' || gateway.status === 'authorized';
  const orderOk = gateway.order_id === razorpay_order_id;
  const currencyOk = String(gateway.currency).toUpperCase() === String(record.currency ?? 'INR').toUpperCase();
  if (!statusOk || !orderOk || !currencyOk || gatewayPaise !== expectedPaise) {
    await supabase.from('payment_audit_logs').insert({
      actor_kind: 'system',
      action: 'razorpay_verify_mismatch',
      detail: {
        payment_record_id,
        expected_paise: expectedPaise,
        gateway_paise: gatewayPaise,
        gateway_status: gateway.status,
        gateway_order: gateway.order_id,
        gateway_currency: gateway.currency,
      },
    });
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
  }

  // 3. Settle — guard on the prior status so a duplicate/concurrent
  //    call cannot double-enqueue receipts.
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ status: 'captured', razorpay_payment_id, razorpay_signature })
    .eq('id', record.id)
    .in('status', SETTLEABLE)
    .select('id, donation_id, dues_id, type, receipt_no')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'Could not update payment' }, { status: 500 });
  }
  if (!payment) {
    // Another request settled it between our load and update — success.
    return NextResponse.json({ ok: true, receipt_no: record.receipt_no });
  }

  if (payment.dues_id) {
    await supabase.from('dues').update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payment.dues_id);
  }

  if (payment.donation_id) {
    await enqueueJob('send_donation_receipt', { donation_id: payment.donation_id });
    await enqueueJob('on_donation_received', { donation_id: payment.donation_id });
  }

  return NextResponse.json({ ok: true, receipt_no: payment.receipt_no });
}
