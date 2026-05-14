import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  source: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid_email' },
      { status: 400 },
    );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Treat as a successful soft signup when DB isn't wired —
    // gives the user a friendly UI rather than a hard error.
    return NextResponse.json({ ok: true, soft: true });
  }
  try {
    const supa = createAdminClient();
    const { error } = await supa
      .from('newsletter_subscribers')
      .upsert(
        {
          email: parsed.data.email.toLowerCase(),
          source: parsed.data.source ?? 'home_signup',
          ip_address: req.headers.get('x-forwarded-for') ?? null,
          user_agent: req.headers.get('user-agent') ?? null,
          unsubscribed_at: null,
        },
        { onConflict: 'email' },
      );
    if (error) {
      // Table missing → graceful fallback.
      if (/does not exist/i.test(error.message)) {
        return NextResponse.json({ ok: true, soft: true });
      }
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'failed' },
      { status: 500 },
    );
  }
}
