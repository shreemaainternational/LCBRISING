import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { renderRefundReceiptPdf } from '@/lib/pdf';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: refund } = await supabase
    .from('refunds')
    .select('id, amount, reason, utr, processed_at, created_at, status, payment_id, payments(amount, invoices(invoice_no, customer_name))')
    .eq('id', id)
    .maybeSingle();
  if (!refund) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (refund.status !== 'processed') {
    return NextResponse.json({ error: 'refund not processed yet' }, { status: 402 });
  }

  type WithLinks = typeof refund & {
    payments: {
      amount: number;
      invoices: { invoice_no: string; customer_name: string } | null;
    } | null;
  };
  const r = refund as WithLinks;
  const inv = r.payments?.invoices;
  if (!inv) return NextResponse.json({ error: 'invoice missing' }, { status: 404 });

  const pdf = await renderRefundReceiptPdf({
    refundId: r.id,
    invoiceNo: inv.invoice_no,
    customerName: inv.customer_name,
    paymentAmount: Number(r.payments?.amount ?? 0),
    refundAmount: Number(r.amount),
    reason: r.reason,
    utr: r.utr,
    processedAt: r.processed_at ?? r.created_at,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="refund-${r.id}.pdf"`,
    },
  });
}
