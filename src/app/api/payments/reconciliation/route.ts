import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvLine(row: unknown[]): string {
  return row.map(csvCell).join(',');
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const supabase = createAdminClient();
  let q = supabase
    .from('payments')
    .select('id, amount, status, method, utr, upi_vpa, receipt_no, created_at, invoices(invoice_no, customer_name, customer_email, customer_phone, amount)')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  const { data: payments, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lines = [
    csvLine([
      'payment_id', 'created_at', 'status', 'method',
      'invoice_no', 'customer_name', 'customer_phone', 'customer_email',
      'invoice_amount', 'paid_amount', 'utr', 'payer_vpa', 'receipt_no',
    ]),
  ];

  type Row = NonNullable<typeof payments>[number] & {
    invoices: { invoice_no: string; customer_name: string; customer_email: string | null; customer_phone: string | null; amount: number } | null;
  };

  for (const raw of payments ?? []) {
    const p = raw as Row;
    const inv = p.invoices;
    lines.push(csvLine([
      p.id,
      p.created_at,
      p.status,
      p.method ?? '',
      inv?.invoice_no ?? '',
      inv?.customer_name ?? '',
      inv?.customer_phone ?? '',
      inv?.customer_email ?? '',
      inv?.amount ?? '',
      p.amount,
      p.utr ?? '',
      p.upi_vpa ?? '',
      p.receipt_no ?? '',
    ]));
  }

  const filename = `reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}
