import { NextResponse } from 'next/server';
import { getInvoiceById, invoiceUpi } from '@/lib/invoices';
import { renderInvoicePdf } from '@/lib/pdf';
import { renderQrPngBuffer } from '@/lib/qr';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const payUrl = `${env.NEXT_PUBLIC_SITE_URL}/pay/${inv.id}`;
  const upi = invoiceUpi(inv);
  const qrPng = upi ? await renderQrPngBuffer(upi) : null;

  const pdf = await renderInvoicePdf({
    invoiceNo: inv.invoice_no,
    date: inv.created_at,
    dueDate: inv.due_date,
    customerName: inv.customer_name,
    customerEmail: inv.customer_email,
    customerPhone: inv.customer_phone,
    description: inv.description,
    amount: Number(inv.amount),
    gstRate: inv.gst_rate ? Number(inv.gst_rate) : null,
    gstAmount: inv.gst_amount ? Number(inv.gst_amount) : null,
    payUrl,
    qrPngBuffer: qrPng,
    status: inv.status,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="invoice-${inv.invoice_no}.pdf"`,
    },
  });
}
