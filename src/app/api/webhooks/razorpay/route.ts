import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { createAdminClient } from '@/lib/supabase/server';
import { enqueueJob } from '@/lib/automation/engine';

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
      .select('id, donation_id, dues_id')
      .maybeSingle();

    if (payment?.donation_id) {
      await enqueueJob('send_donation_receipt', { donation_id: payment.donation_id });
    }
    if (payment?.dues_id) {
      await supabase.from('dues').update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', payment.dues_id);
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
