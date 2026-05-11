import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { renderPaymentReceiptPdf } from '@/lib/pdf';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, receipt_no, utr, upi_vpa, method, status, created_at, invoices(invoice_no, customer_name, customer_email)')
    .eq('id', id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    return NextResponse.json({ error: 'payment not captured' }, { status: 402 });
  }

  type WithInvoice = typeof payment & {
    invoices: { invoice_no: string; customer_name: string; customer_email: string | null } | null;
  };
  const p = payment as WithInvoice;
  const inv = p.invoices;
  if (!inv) return NextResponse.json({ error: 'invoice missing' }, { status: 404 });

  const pdf = await renderPaymentReceiptPdf({
    receiptNo: p.receipt_no ?? p.id,
    invoiceNo: inv.invoice_no,
    customerName: inv.customer_name,
    customerEmail: inv.customer_email,
    amount: Number(p.amount),
    utr: p.utr,
    upiVpa: p.upi_vpa,
    method: p.method,
    paidOn: p.created_at,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="receipt-${p.receipt_no ?? p.id}.pdf"`,
    },
  });
}
