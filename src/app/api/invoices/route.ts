import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { invoiceCreateSchema } from '@/lib/validation/schemas';
import { createAdminClient } from '@/lib/supabase/server';
import { buildInvoiceNo } from '@/lib/invoices';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = invoiceCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const supabase = createAdminClient();
  const invoiceNo = buildInvoiceNo();
  const gstAmount = data.gst_rate ? Number((data.amount * (data.gst_rate / 100)).toFixed(2)) : null;
  const expiresAt = data.expires_in_minutes
    ? new Date(Date.now() + data.expires_in_minutes * 60_000).toISOString()
    : null;

  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({
      invoice_no: invoiceNo,
      customer_name: data.customer_name,
      customer_email: data.customer_email ?? null,
      customer_phone: data.customer_phone ?? null,
      amount: data.amount,
      gst_rate: data.gst_rate ?? null,
      gst_amount: gstAmount,
      description: data.description ?? null,
      due_date: data.due_date ?? null,
      expires_at: expiresAt,
      member_id: data.member_id ?? null,
      metadata: data.metadata ?? {},
      status: 'sent',
    })
    .select('id, invoice_no')
    .single();
  if (error || !inv) {
    return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 500 });
  }

  const payUrl = `${env.NEXT_PUBLIC_SITE_URL}/pay/${inv.id}`;

  await supabase.from('payment_audit_logs').insert({
    invoice_id: inv.id,
    actor_kind: 'admin',
    action: 'invoice_created',
    detail: { invoice_no: inv.invoice_no, amount: data.amount },
  });

  return NextResponse.json({ id: inv.id, invoice_no: inv.invoice_no, pay_url: payUrl });
}
