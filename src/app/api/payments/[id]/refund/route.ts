import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { refundCreateSchema } from '@/lib/validation/schemas';
import { sendWhatsApp, whatsAppConfigured } from '@/lib/whatsapp';
import { sendEmail } from '@/lib/email';
import { env, integrations } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let member;
  try {
    member = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = refundCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, status, invoice_id, invoices(id, invoice_no, customer_name, customer_email, customer_phone, amount)')
    .eq('id', id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: 'payment not found' }, { status: 404 });
  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    return NextResponse.json({ error: `payment is ${payment.status}, cannot refund` }, { status: 409 });
  }

  const amount = data.amount ?? Number(payment.amount);
  if (amount > Number(payment.amount)) {
    return NextResponse.json({ error: 'refund exceeds payment amount' }, { status: 400 });
  }

  const { data: refund, error } = await supabase
    .from('refunds')
    .insert({
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      amount,
      reason: data.reason ?? null,
      utr: data.utr ?? null,
      notes: data.notes ?? null,
      status: data.status,
      initiated_by: member.id,
      processed_at: data.status === 'processed' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (error || !refund) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  if (data.status === 'processed') {
    await supabase.from('payments').update({ status: 'refunded' }).eq('id', payment.id);
    if (payment.invoice_id) {
      await supabase.from('invoices').update({ status: 'refunded' }).eq('id', payment.invoice_id);
    }
  }

  type WithInvoice = typeof payment & {
    invoices: {
      id: string;
      invoice_no: string;
      customer_name: string;
      customer_email: string | null;
      customer_phone: string | null;
      amount: number;
    } | null;
  };
  const inv = (payment as WithInvoice).invoices;

  await supabase.from('payment_audit_logs').insert({
    invoice_id: payment.invoice_id,
    payment_id: payment.id,
    actor_id: member.id,
    actor_kind: 'admin',
    action: 'refund_' + data.status,
    detail: { refund_id: refund.id, amount, reason: data.reason ?? null, utr: data.utr ?? null },
  });

  if (data.status === 'processed' && inv) {
    if (inv.customer_phone && whatsAppConfigured) {
      try {
        await sendWhatsApp(
          inv.customer_phone,
          [
            '🦁 Lions Club Baroda Rising Star',
            '',
            `Dear ${inv.customer_name},`,
            `A refund of ₹${amount.toLocaleString('en-IN')} for invoice ${inv.invoice_no} has been processed.`,
            data.utr ? `Refund UTR: ${data.utr}` : '',
            'The amount should reflect in your account shortly.',
          ].filter(Boolean).join('\n'),
        );
      } catch {
        /* swallow */
      }
    }
    if (inv.customer_email && integrations.resend) {
      try {
        await sendEmail({
          to: inv.customer_email,
          subject: `Refund processed for invoice ${inv.invoice_no}`,
          html: `<p>Dear ${inv.customer_name},</p>
            <p>A refund of <strong>₹${amount.toLocaleString('en-IN')}</strong> for invoice
            <strong>${inv.invoice_no}</strong> has been processed.</p>
            ${data.utr ? `<p>Refund UTR: <strong>${data.utr}</strong></p>` : ''}
            <p>The amount should reflect in your account shortly.</p>
            <p><a href="${env.NEXT_PUBLIC_SITE_URL}/api/refunds/${refund.id}/receipt">Download refund receipt (PDF)</a></p>
            <p>Lions Club of Baroda Rising Star</p>`,
        });
      } catch {
        /* swallow */
      }
    }
  }

  return NextResponse.json({ ok: true, refund_id: refund.id, status: data.status });
}
