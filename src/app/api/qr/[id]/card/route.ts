import { NextResponse } from 'next/server';
import { getInvoiceById, invoiceUpi } from '@/lib/invoices';
import { renderQrCardSvg, renderQrCardPdf } from '@/lib/qr-card';
import { getUpiConfig } from '@/lib/upi';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const fmt = url.searchParams.get('format') === 'pdf' ? 'pdf' : 'svg';

  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const upi = invoiceUpi(inv);
  if (!upi) {
    return NextResponse.json({ error: 'UPI VPA is not configured on the server' }, { status: 503 });
  }

  const cfg = getUpiConfig();
  const payUrl = `${env.NEXT_PUBLIC_SITE_URL}/pay/${inv.id}`;
  const cardInput = {
    upiString: upi,
    invoiceNo: inv.invoice_no,
    amount: Number(inv.amount),
    payeeName: cfg.payeeName,
    customerName: inv.customer_name,
    description: inv.description,
    payUrl,
  };

  if (fmt === 'pdf') {
    const pdf = await renderQrCardPdf(cardInput);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'cache-control': 'public, max-age=300',
        'content-disposition': `inline; filename="qr-${inv.invoice_no}.pdf"`,
      },
    });
  }

  const svg = await renderQrCardSvg(cardInput);
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'content-disposition': `inline; filename="qr-${inv.invoice_no}.svg"`,
    },
  });
}
