import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/razorpay';
import { buildReceiptNo } from '@/lib/utils';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { data: dues, error } = await supabase
    .from('dues')
    .select('id, amount, member_id, status, members(email, user_id)')
    .eq('id', id).single();
  if (error || !dues) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (dues.status === 'paid') return NextResponse.json({ error: 'already paid' }, { status: 409 });

  const admin = createAdminClient();
  const receipt = buildReceiptNo('DUE');
  const { data: payment, error: payErr } = await admin
    .from('payments')
    .insert({
      type: 'dues',
      amount: dues.amount,
      member_id: dues.member_id,
      dues_id: dues.id,
      status: 'created',
      receipt_no: receipt,
    })
    .select('id').single();
  if (payErr || !payment) return NextResponse.json({ error: payErr?.message }, { status: 500 });

  const order = await createOrder({
    amount: dues.amount,
    receipt,
    notes: { dues_id: dues.id, payment_id: payment.id },
  });
  await admin.from('payments').update({ razorpay_order_id: order.id }).eq('id', payment.id);

  return NextResponse.json({
    order,
    payment_record_id: payment.id,
    key_id: env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? env.RAZORPAY_KEY_ID,
  });
}
