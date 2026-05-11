import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { proofReviewSchema } from '@/lib/validation/schemas';
import { createAdminClient } from '@/lib/supabase/server';
import { markInvoicePaid } from '@/lib/invoices';
import { buildReceiptNo } from '@/lib/utils';
import { sendPaymentConfirmation } from '@/lib/payment-notify';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let member;
  try {
    member = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = proofReviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { proof_id, decision, rejection_reason } = parsed.data;

  const supabase = createAdminClient();

  const { data: proof } = await supabase
    .from('payment_proofs')
    .select('id, invoice_id, status, utr, upi_vpa, method, amount_claimed')
    .eq('id', proof_id)
    .maybeSingle();
  if (!proof) return NextResponse.json({ error: 'proof not found' }, { status: 404 });
  if (proof.status !== 'pending') {
    return NextResponse.json({ error: `proof already ${proof.status}` }, { status: 409 });
  }

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, amount, customer_name, customer_email, customer_phone, member_id, invoice_no')
    .eq('id', proof.invoice_id!)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });

  if (decision === 'rejected') {
    await supabase
      .from('payment_proofs')
      .update({
        status: 'rejected',
        reviewed_by: member.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason ?? null,
      })
      .eq('id', proof_id);
    await supabase.from('payment_audit_logs').insert({
      invoice_id: inv.id,
      actor_id: member.id,
      actor_kind: 'admin',
      action: 'proof_rejected',
      detail: { proof_id, rejection_reason: rejection_reason ?? null },
    });
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  const receiptNo = buildReceiptNo('DON');
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      type: 'invoice',
      amount: inv.amount,
      member_id: inv.member_id ?? null,
      invoice_id: inv.id,
      status: 'captured',
      receipt_no: receiptNo,
      utr: proof.utr,
      upi_vpa: proof.upi_vpa,
      method: proof.method,
    })
    .select('id')
    .single();
  if (payErr || !payment) {
    return NextResponse.json({ error: payErr?.message ?? 'payment insert failed' }, { status: 500 });
  }

  await supabase
    .from('payment_proofs')
    .update({
      status: 'verified',
      reviewed_by: member.id,
      reviewed_at: new Date().toISOString(),
      payment_id: payment.id,
    })
    .eq('id', proof_id);

  await markInvoicePaid(inv.id, payment.id);

  await supabase.from('payment_audit_logs').insert({
    invoice_id: inv.id,
    payment_id: payment.id,
    actor_id: member.id,
    actor_kind: 'admin',
    action: 'proof_verified',
    detail: { proof_id, receipt_no: receiptNo },
  });

  const notify = await sendPaymentConfirmation({
    invoiceId: inv.id,
    invoiceNo: inv.invoice_no,
    customerName: inv.customer_name,
    customerEmail: inv.customer_email,
    customerPhone: inv.customer_phone,
    amount: Number(inv.amount),
    receiptNo,
    paymentId: payment.id,
  });

  return NextResponse.json({
    ok: true,
    status: 'verified',
    payment_id: payment.id,
    receipt_no: receiptNo,
    notify,
  });
}
