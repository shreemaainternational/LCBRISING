import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function normalizePhone(input: string): string[] {
  const digits = input.replace(/\D/g, '');
  if (!digits) return [];
  const last10 = digits.slice(-10);
  const variants = new Set<string>([
    digits,
    last10,
    `+91${last10}`,
    `91${last10}`,
    `0${last10}`,
  ]);
  return [...variants].filter(Boolean);
}

export async function POST(req: Request) {
  const limit = rateLimit(`lookup:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => null) as { phone?: string; invoice_no?: string } | null;
  const phone = body?.phone?.trim();
  const invoiceNo = body?.invoice_no?.trim();
  if (!phone || !invoiceNo) {
    return NextResponse.json({ error: 'phone and invoice_no required' }, { status: 400 });
  }

  const phoneVariants = normalizePhone(phone);
  if (phoneVariants.length === 0) {
    return NextResponse.json({ error: 'invalid phone' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, invoice_no, customer_name, customer_phone, amount, status, created_at, due_date')
    .eq('invoice_no', invoiceNo)
    .is('deleted_at', null)
    .maybeSingle();

  if (!inv) {
    return NextResponse.json({ error: 'no matching invoice' }, { status: 404 });
  }

  const invPhoneDigits = (inv.customer_phone ?? '').replace(/\D/g, '');
  const matches = phoneVariants.some((v) => {
    const vDigits = v.replace(/\D/g, '');
    return vDigits.length >= 6 && (invPhoneDigits.endsWith(vDigits) || vDigits.endsWith(invPhoneDigits));
  });
  if (!matches) {
    return NextResponse.json({ error: 'no matching invoice' }, { status: 404 });
  }

  let receiptUrl: string | null = null;
  if (inv.status === 'paid') {
    const { data: payment } = await supabase
      .from('payments')
      .select('id')
      .eq('invoice_id', inv.id)
      .eq('status', 'captured')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (payment) {
      receiptUrl = `/api/payments/${payment.id}/receipt`;
    }
  }

  return NextResponse.json({
    invoice: {
      id: inv.id,
      invoice_no: inv.invoice_no,
      customer_name: inv.customer_name,
      amount: Number(inv.amount),
      status: inv.status,
      created_at: inv.created_at,
      due_date: inv.due_date,
    },
    pay_url: inv.status === 'paid' ? null : `/pay/${inv.id}`,
    invoice_pdf_url: `/api/invoices/${inv.id}/pdf`,
    receipt_pdf_url: receiptUrl,
  });
}
