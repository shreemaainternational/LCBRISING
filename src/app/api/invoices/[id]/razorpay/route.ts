import { NextResponse } from 'next/server';
import { getInvoiceById, isExpired } from '@/lib/invoices';
import { createAdminClient } from '@/lib/supabase/server';
import { createOrder, verifyCheckoutSignature } from '@/lib/razorpay';
import { buildReceiptNo } from '@/lib/utils';
import { markInvoicePaid } from '@/lib/invoices';
import { sendPaymentConfirmation } from '@/lib/payment-notify';
import { env, integrations } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Create a Razorpay order for an invoice. Returns checkout params for
 * the client SDK. The actual capture happens via the existing
 * /api/webhooks/razorpay route (already verifies HMAC and updates rows).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!integrations.razorpay) {
    return NextResponse.json({ error: 'Razorpay not configured' }, { status: 503 });
  }

  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });
  if (inv.status === 'paid') return NextResponse.json({ error: 'already paid' }, { status: 409 });
  if (isExpired(inv)) return NextResponse.json({ error: 'invoice expired' }, { status: 410 });

  const supabase = createAdminClient();
  const receipt = buildReceiptNo('DON');

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      type: 'invoice',
      amount: Number(inv.amount),
      invoice_id: inv.id,
      member_id: inv.member_id ?? null,
      status: 'created',
      receipt_no: receipt,
      method: 'razorpay',
    })
    .select('id')
    .single();
  if (error || !payment) {
    return NextResponse.json({ error: error?.message ?? 'payment insert failed' }, { status: 500 });
  }

  const order = await createOrder({
    amount: Number(inv.amount),
    receipt,
    notes: { invoice_id: inv.id, invoice_no: inv.invoice_no, payment_id: payment.id },
  });

  await supabase.from('payments').update({ razorpay_order_id: order.id }).eq('id', payment.id);

  return NextResponse.json({
    order,
    payment_record_id: payment.id,
    key_id: env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? env.RAZORPAY_KEY_ID,
    customer: {
      name: inv.customer_name,
      email: inv.customer_email,
      phone: inv.customer_phone,
    },
  });
}

/**
 * Client-side verify after Razorpay handler returns. The webhook is the
 * source of truth but this endpoint gives the customer an instant
 * receipt + redirect rather than waiting on webhook delivery.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!integrations.razorpay) {
    return NextResponse.json({ error: 'Razorpay not configured' }, { status: 503 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null) as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    payment_record_id?: string;
  } | null;
  if (!body?.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature || !body.payment_record_id) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  if (!verifyCheckoutSignature({
    order_id: body.razorpay_order_id,
    payment_id: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  })) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });

  const supabase = createAdminClient();
  await supabase
    .from('payments')
    .update({
      status: 'captured',
      razorpay_payment_id: body.razorpay_payment_id,
      razorpay_signature: body.razorpay_signature,
    })
    .eq('id', body.payment_record_id);

  if (inv.status !== 'paid') {
    await markInvoicePaid(inv.id, body.payment_record_id);
    await sendPaymentConfirmation({
      invoiceId: inv.id,
      invoiceNo: inv.invoice_no,
      customerName: inv.customer_name,
      customerEmail: inv.customer_email,
      customerPhone: inv.customer_phone,
      amount: Number(inv.amount),
      receiptNo: `RZP-${body.razorpay_payment_id.slice(-8)}`,
      paymentId: body.payment_record_id,
    });
  }
  return NextResponse.json({ ok: true, payment_id: body.payment_record_id });
}
