import { NextResponse } from 'next/server';
import { donationIntentSchema } from '@/lib/validation/schemas';
import { createOrder } from '@/lib/razorpay';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { buildReceiptNo } from '@/lib/utils';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const limit = rateLimit(`donate:${clientIp(req)}`, 20, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const json = await req.json().catch(() => null);
  const parsed = donationIntentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const supabase = createAdminClient();

  const receiptNo = buildReceiptNo('DON');

  // Insert provisional donation row
  const { data: donation, error: donErr } = await supabase
    .from('donations')
    .insert({
      donor_name: data.donor_name,
      donor_email: data.donor_email ?? null,
      donor_phone: data.donor_phone ?? null,
      donor_pan: data.donor_pan ?? null,
      amount: data.amount,
      campaign: data.campaign ?? null,
      message: data.message ?? null,
      is_anonymous: data.is_anonymous,
      receipt_no: receiptNo,
    })
    .select('id')
    .single();
  if (donErr || !donation) {
    return NextResponse.json({ error: donErr?.message ?? 'DB error' }, { status: 500 });
  }

  // Create payment record
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      type: 'donation',
      amount: data.amount,
      donation_id: donation.id,
      status: 'created',
      receipt_no: receiptNo,
    })
    .select('id')
    .single();
  if (payErr || !payment) {
    return NextResponse.json({ error: payErr?.message ?? 'DB error' }, { status: 500 });
  }

  let order;
  try {
    order = await createOrder({
      amount: data.amount,
      receipt: receiptNo,
      notes: { donation_id: donation.id, payment_id: payment.id },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Razorpay error' },
      { status: 500 },
    );
  }

  await supabase.from('payments')
    .update({ razorpay_order_id: order.id })
    .eq('id', payment.id);
  await supabase.from('donations')
    .update({ payment_id: payment.id })
    .eq('id', donation.id);

  return NextResponse.json({
    order,
    donation_id: donation.id,
    payment_record_id: payment.id,
    receipt_no: receiptNo,
    key_id: env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? env.RAZORPAY_KEY_ID,
  });
}
