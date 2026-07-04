import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { markInvoicePaid } from '@/lib/invoices';
import { buildReceiptNo } from '@/lib/utils';
import { env } from '@/lib/env';
import { sendPaymentConfirmation } from '@/lib/payment-notify';
import { enqueueJob } from '@/lib/automation/engine';

export const runtime = 'nodejs';

/**
 * PhonePe Business webhook.
 *
 * PhonePe sends an X-VERIFY header which is sha256(base64Body + saltKey) + '###' + saltIndex.
 * For the merchant-callback flavor that uses HTTP basic auth, we check the auth header instead.
 */
/** Constant-time string comparison; false on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf-8');
  const bb = Buffer.from(b, 'utf-8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function verifyPhonePeSignature(rawBody: string, header: string | null): boolean {
  if (!header || !env.PHONEPE_SALT_KEY) return false;
  const [signature, idx] = header.split('###');
  if (!signature || !idx) return false;
  if (env.PHONEPE_SALT_INDEX && idx !== env.PHONEPE_SALT_INDEX) return false;
  const expected = createHash('sha256').update(rawBody + env.PHONEPE_SALT_KEY).digest('hex');
  return safeEqual(expected, signature);
}

function verifyBasicAuth(header: string | null): boolean {
  if (!header || !env.PHONEPE_WEBHOOK_USERNAME || !env.PHONEPE_WEBHOOK_PASSWORD) return false;
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
  const [user, pass] = decoded.split(':');
  return safeEqual(user ?? '', env.PHONEPE_WEBHOOK_USERNAME) && safeEqual(pass ?? '', env.PHONEPE_WEBHOOK_PASSWORD);
}

type PhonePeEvent = {
  event?: string;
  payload?: {
    merchantTransactionId?: string;
    transactionId?: string;
    amount?: number;
    state?: string;
    paymentInstrument?: { utr?: string; vpa?: string };
  };
  response?: string;
};

export async function POST(req: Request) {
  const raw = await req.text();
  const xVerify = req.headers.get('x-verify');
  const authHeader = req.headers.get('authorization');

  const sigOk = verifyPhonePeSignature(raw, xVerify);
  const basicOk = verifyBasicAuth(authHeader);
  if (!sigOk && !basicOk) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: PhonePeEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const supabase = createAdminClient();
  await supabase.from('payment_audit_logs').insert({
    actor_kind: 'system',
    action: 'phonepe_webhook',
    detail: event as unknown as Record<string, unknown>,
  });

  const merchantTxn = event.payload?.merchantTransactionId;
  const state = event.payload?.state;
  if (!merchantTxn || state !== 'COMPLETED') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, amount, invoice_no, status, member_id, customer_name, customer_email, customer_phone')
    .eq('invoice_no', merchantTxn)
    .maybeSingle();

  // Not an invoice — try a donation payment (receipt_no = merchantTxn).
  if (!inv) {
    const { data: donPayment } = await supabase
      .from('payments')
      .select('id, donation_id, status')
      .eq('receipt_no', merchantTxn)
      .eq('type', 'donation')
      .maybeSingle();

    if (!donPayment) {
      return NextResponse.json({ ok: true, no_match: true });
    }
    if (donPayment.status === 'captured') {
      return NextResponse.json({ ok: true, already_paid: true });
    }

    await supabase
      .from('payments')
      .update({
        status: 'captured',
        method: 'phonepe_webhook',
        utr: event.payload?.paymentInstrument?.utr ?? null,
        upi_vpa: event.payload?.paymentInstrument?.vpa ?? null,
        raw_event: event as unknown as Record<string, unknown>,
      })
      .eq('id', donPayment.id);

    if (donPayment.donation_id) {
      await enqueueJob('send_donation_receipt', { donation_id: donPayment.donation_id });
      await enqueueJob('on_donation_received', { donation_id: donPayment.donation_id });
    }
    return NextResponse.json({ ok: true, donation: true });
  }
  if (inv.status === 'paid') {
    return NextResponse.json({ ok: true, already_paid: true });
  }

  const receiptNo = buildReceiptNo('DON');
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      type: 'invoice',
      amount: inv.amount,
      member_id: inv.member_id ?? null,
      invoice_id: inv.id,
      status: 'captured',
      receipt_no: receiptNo,
      utr: event.payload?.paymentInstrument?.utr ?? null,
      upi_vpa: event.payload?.paymentInstrument?.vpa ?? null,
      method: 'phonepe_webhook',
      raw_event: event as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  await markInvoicePaid(inv.id, payment?.id);

  if (payment) {
    await sendPaymentConfirmation({
      invoiceId: inv.id,
      invoiceNo: inv.invoice_no,
      customerName: inv.customer_name,
      customerEmail: inv.customer_email,
      customerPhone: inv.customer_phone,
      amount: Number(inv.amount),
      receiptNo,
      paymentId: payment.id,
    });
  }

  return NextResponse.json({ ok: true });
}
