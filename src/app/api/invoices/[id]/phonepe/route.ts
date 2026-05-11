import { NextResponse } from 'next/server';
import { getInvoiceById, isExpired } from '@/lib/invoices';
import { createAdminClient } from '@/lib/supabase/server';
import { initiatePayment, phonepeConfigured } from '@/lib/phonepe';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`phonepe:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'too many requests' }, { status: 429 });

  if (!phonepeConfigured()) {
    return NextResponse.json({ error: 'PhonePe PG not configured' }, { status: 503 });
  }

  const { id } = await params;
  const inv = await getInvoiceById(id);
  if (!inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });
  if (inv.status === 'paid') return NextResponse.json({ error: 'already paid' }, { status: 409 });
  if (inv.status === 'cancelled') return NextResponse.json({ error: 'invoice cancelled' }, { status: 410 });
  if (isExpired(inv)) return NextResponse.json({ error: 'invoice expired' }, { status: 410 });

  const supabase = createAdminClient();

  const meta = (inv.metadata ?? {}) as Record<string, unknown>;
  const existingUrl = typeof meta.phonepe_redirect_url === 'string' ? meta.phonepe_redirect_url : null;
  const existingAt = typeof meta.phonepe_initiated_at === 'string' ? meta.phonepe_initiated_at : null;
  if (existingUrl && existingAt && Date.now() - new Date(existingAt).getTime() < 10 * 60_000) {
    return NextResponse.json({ redirect_url: existingUrl, reused: true });
  }

  const result = await initiatePayment({
    merchantTransactionId: inv.invoice_no,
    merchantUserId: `INV-${inv.id.slice(0, 12)}`,
    amount: Number(inv.amount),
    redirectUrl: `${env.NEXT_PUBLIC_SITE_URL}/pay/${inv.id}?phonepe=done`,
    callbackUrl: `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/phonepe`,
    mobile: inv.customer_phone ?? undefined,
  });

  if (!result.success || !result.redirectUrl) {
    await supabase.from('payment_audit_logs').insert({
      invoice_id: inv.id,
      actor_kind: 'system',
      action: 'phonepe_initiate_failed',
      detail: { error: result.error, raw: result.raw as Record<string, unknown> | null },
    });
    return NextResponse.json({ error: result.error ?? 'phonepe initiate failed' }, { status: 502 });
  }

  await supabase
    .from('invoices')
    .update({
      metadata: {
        ...meta,
        phonepe_redirect_url: result.redirectUrl,
        phonepe_transaction_id: result.transactionId ?? inv.invoice_no,
        phonepe_initiated_at: new Date().toISOString(),
      },
    })
    .eq('id', inv.id);

  await supabase.from('payment_audit_logs').insert({
    invoice_id: inv.id,
    actor_kind: 'system',
    action: 'phonepe_initiated',
    detail: { transaction_id: result.transactionId, redirect_url: result.redirectUrl },
  });

  return NextResponse.json({ redirect_url: result.redirectUrl });
}
