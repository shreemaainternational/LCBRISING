import { NextResponse } from 'next/server';
import { getInvoiceById, invoiceUpi } from '@/lib/invoices';
import { renderQrSvg, renderQrPngBuffer } from '@/lib/qr';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const fmt = url.searchParams.get('format') === 'png' ? 'png' : 'svg';

  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const upi = invoiceUpi(inv);
  if (!upi) {
    return NextResponse.json({ error: 'UPI VPA is not configured on the server' }, { status: 503 });
  }

  if (fmt === 'png') {
    const buf = await renderQrPngBuffer(upi);
    return new Response(new Uint8Array(buf), {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=300, immutable',
        'content-disposition': `inline; filename="${inv.invoice_no}.png"`,
      },
    });
  }

  const svg = await renderQrSvg(upi);
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=300, immutable',
    },
  });
}
