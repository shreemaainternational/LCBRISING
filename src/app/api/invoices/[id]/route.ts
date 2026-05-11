import { NextResponse } from 'next/server';
import { getInvoiceById, invoiceUpi, isExpired } from '@/lib/invoices';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({
    id: inv.id,
    invoice_no: inv.invoice_no,
    customer_name: inv.customer_name,
    amount: Number(inv.amount),
    currency: inv.currency,
    description: inv.description,
    status: inv.status,
    expires_at: inv.expires_at,
    expired: isExpired(inv),
    upi_string: invoiceUpi(inv),
  });
}
