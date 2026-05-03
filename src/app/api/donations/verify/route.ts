import { NextResponse } from 'next/server';
import { paymentVerifySchema } from '@/lib/validation/schemas';
import { verifyCheckoutSignature } from '@/lib/razorpay';
import { createAdminClient } from '@/lib/supabase/server';
import { enqueueJob } from '@/lib/automation/engine';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = paymentVerifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_record_id } = parsed.data;

  const ok = verifyCheckoutSignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!ok) {
    const supabase = createAdminClient();
    await supabase.from('payments')
      .update({ status: 'failed', razorpay_payment_id, razorpay_signature })
      .eq('id', payment_record_id);
    return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: payment, error } = await supabase
    .from('payments')
    .update({
      status: 'captured',
      razorpay_payment_id,
      razorpay_signature,
    })
    .eq('id', payment_record_id)
    .select('id, donation_id, dues_id, type, receipt_no')
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: error?.message ?? 'Payment not found' }, { status: 404 });
  }

  if (payment.dues_id) {
    await supabase.from('dues').update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payment.dues_id);
  }

  if (payment.donation_id) {
    await enqueueJob('send_donation_receipt', { donation_id: payment.donation_id });
    await enqueueJob('on_donation_received', { donation_id: payment.donation_id });
    await enqueueJob('post_donation_journal', { donation_id: payment.donation_id });
  }
  if (payment.dues_id) {
    await enqueueJob('post_dues_payment_journal', { payment_id: payment.id });
  }

  return NextResponse.json({ ok: true, receipt_no: payment.receipt_no });
}
