import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  whatsapp: z.string().max(20).optional(),
  channels: z.array(z.enum(['email', 'whatsapp'])).optional(),
  source: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Soft-success when DB isn't wired — keeps the UI friendly.
    return NextResponse.json({ ok: true, soft: true });
  }

  const { email, name, whatsapp, channels, source } = parsed.data;

  try {
    const supa = createAdminClient();
    const { error } = await supa
      .from('newsletter_subscribers')
      .upsert(
        {
          email: email.toLowerCase(),
          name: name ?? null,
          whatsapp: whatsapp ?? null,
          channels: channels && channels.length > 0 ? channels : ['email'],
          source: source ?? 'home_signup',
          ip_address: req.headers.get('x-forwarded-for') ?? null,
          user_agent: req.headers.get('user-agent') ?? null,
          unsubscribed_at: null,
        },
        { onConflict: 'email' },
      );
    if (error) {
      // Table missing or columns not yet migrated → graceful fallback
      // so the form never hard-fails on the visitor.
      if (/does not exist|column/i.test(error.message)) {
        // Retry with the minimal column set.
        const { error: minErr } = await supa
          .from('newsletter_subscribers')
          .upsert(
            { email: email.toLowerCase(), source: source ?? 'home_signup' },
            { onConflict: 'email' },
          );
        if (minErr && /does not exist/i.test(minErr.message)) {
          return NextResponse.json({ ok: true, soft: true });
        }
        if (minErr) {
          return NextResponse.json({ ok: false, error: minErr.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, partial: true });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'failed' },
      { status: 500 },
    );
  }
}
