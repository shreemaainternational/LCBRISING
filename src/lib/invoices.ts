import { createAdminClient } from '@/lib/supabase/server';
import { buildUpiString } from '@/lib/upi';

export function buildInvoiceNo() {
  const ts = new Date();
  const yy = String(ts.getFullYear()).slice(-2);
  const mm = String(ts.getMonth() + 1).padStart(2, '0');
  const dd = String(ts.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 900000) + 100000;
  return `INV-${yy}${mm}${dd}-${seq}`;
}

export type InvoiceRow = {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  amount: number;
  currency: string;
  gst_rate: number | null;
  gst_amount: number | null;
  description: string | null;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'cancelled' | 'expired';
  due_date: string | null;
  expires_at: string | null;
  member_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function getInvoiceById(id: string): Promise<InvoiceRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  return (data as InvoiceRow | null) ?? null;
}

export async function markInvoicePaid(invoiceId: string, paymentId?: string) {
  const supabase = createAdminClient();
  const { data: inv } = await supabase
    .from('invoices')
    .select('amount, agent_id, commission_rate')
    .eq('id', invoiceId)
    .maybeSingle();
  await supabase
    .from('invoices')
    .update({ status: 'paid' })
    .eq('id', invoiceId);
  await supabase.from('payment_audit_logs').insert({
    invoice_id: invoiceId,
    payment_id: paymentId ?? null,
    actor_kind: 'system',
    action: 'invoice_paid',
    detail: { source: 'verification' },
  });

  type WithCommission = { amount: number; agent_id: string | null; commission_rate: number | null } | null;
  const invc = inv as WithCommission;
  if (invc?.agent_id && invc.commission_rate && invc.commission_rate > 0) {
    const base = Number(invc.amount);
    const rate = Number(invc.commission_rate);
    const commission = Math.round(base * (rate / 100) * 100) / 100;
    await supabase.from('commission_records').insert({
      invoice_id: invoiceId,
      payment_id: paymentId ?? null,
      agent_id: invc.agent_id,
      base_amount: base,
      rate,
      commission_amount: commission,
      status: 'pending',
    });
  }
}

export function invoiceUpi(inv: InvoiceRow) {
  return buildUpiString({
    amount: Number(inv.amount),
    invoiceNo: inv.invoice_no,
    note: inv.description ?? `Invoice ${inv.invoice_no}`,
  });
}

export function isExpired(inv: InvoiceRow): boolean {
  if (!inv.expires_at) return false;
  return new Date(inv.expires_at).getTime() < Date.now();
}
