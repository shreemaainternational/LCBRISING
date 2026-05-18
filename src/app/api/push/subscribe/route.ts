import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { isPushConfiguredAsync, getVapidPublicKeyAsync } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  userAgent: z.string().optional(),
  topics: z.array(z.string()).default([]),
});

/** GET — return public VAPID key the client needs to subscribe. */
export async function GET() {
  const [configured, publicKey] = await Promise.all([
    isPushConfiguredAsync(),
    getVapidPublicKeyAsync(),
  ]);
  return NextResponse.json({ configured, publicKey });
}

/** POST — register / upsert a subscription. */
export async function POST(req: Request) {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.from('push_subscriptions').upsert({
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    member_id: me.id,
    user_agent: parsed.data.userAgent ?? null,
    topics: parsed.data.topics,
    is_active: true,
  }, { onConflict: 'endpoint' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
