import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { normalisePhone } from '@/lib/phone';
import { setPortalCookie } from '@/lib/portal-session';

export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const limit = rateLimit(`otp-verify:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => null) as { phone?: string; code?: string } | null;
  const norm = body?.phone ? normalisePhone(body.phone) : null;
  const code = body?.code?.trim();
  if (!norm || !code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'phone + 6-digit code required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const codeHash = createHash('sha256').update(code).digest('hex');

  const { data: otp } = await supabase
    .from('portal_otp_codes')
    .select('id, code_hash, expires_at, attempts, used_at')
    .eq('phone_norm', norm)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return NextResponse.json({ error: 'no code requested' }, { status: 404 });
  }
  if (otp.used_at) {
    return NextResponse.json({ error: 'code already used' }, { status: 409 });
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'code expired' }, { status: 410 });
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'too many attempts' }, { status: 429 });
  }

  if (otp.code_hash !== codeHash) {
    await supabase
      .from('portal_otp_codes')
      .update({ attempts: otp.attempts + 1 })
      .eq('id', otp.id);
    return NextResponse.json({ error: 'invalid code' }, { status: 401 });
  }

  await supabase
    .from('portal_otp_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', otp.id);

  await setPortalCookie(norm);
  return NextResponse.json({ ok: true });
}
