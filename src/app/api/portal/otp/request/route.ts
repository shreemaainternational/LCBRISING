import { NextResponse } from 'next/server';
import { createHash, randomInt } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { normalisePhone, phoneVariants } from '@/lib/phone';
import { sendWhatsApp, whatsAppConfigured } from '@/lib/whatsapp';

export const runtime = 'nodejs';

const OTP_TTL_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  const limit = rateLimit(`otp-req:${clientIp(req)}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => null) as { phone?: string } | null;
  const norm = body?.phone ? normalisePhone(body.phone) : null;
  if (!norm) {
    return NextResponse.json({ error: 'invalid phone' }, { status: 400 });
  }
  if (!whatsAppConfigured) {
    // Don't leak server-config internals to the customer.
    return NextResponse.json(
      { error: 'WhatsApp sign-in is temporarily unavailable. Please contact the club office.' },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();

  // Only send an OTP to a number that actually has at least one invoice.
  const variants = phoneVariants(norm);
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, customer_phone')
    .in('customer_phone', variants)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();
  if (!invoice) {
    // Don't leak whether the number is on file — pretend to send.
    return NextResponse.json({ ok: true, sent: false });
  }

  const phoneStored = invoice.customer_phone ?? `+91${norm}`;

  // Throttle: one fresh OTP per 60s.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await supabase
    .from('portal_otp_codes')
    .select('id')
    .eq('phone_norm', norm)
    .gte('created_at', since)
    .limit(1)
    .maybeSingle();
  if (recent) {
    return NextResponse.json({ error: 'OTP already sent, please wait' }, { status: 429 });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error } = await supabase
    .from('portal_otp_codes')
    .insert({ phone_norm: norm, code_hash: codeHash, expires_at: expiresAt });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await sendWhatsApp(
      phoneStored,
      [
        '🦁 Lions Club Baroda Rising Star',
        '',
        `Your portal verification code is: ${code}`,
        '',
        'Expires in 5 minutes. Do not share this code.',
      ].join('\n'),
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'send failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent: true });
}
