import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { broadcastPush, broadcastToTopic, pushToMember, isPushConfigured } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(400).optional(),
  url: z.string().optional(),
  icon: z.string().url().optional(),
  tag: z.string().optional(),
  target: z.object({
    kind: z.enum(['broadcast', 'topic', 'member']).default('broadcast'),
    topic: z.string().optional(),
    memberId: z.string().uuid().optional(),
  }).default({ kind: 'broadcast' }),
});

/** POST /api/push/send — admin-only push dispatcher. */
export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'web_push_not_configured' }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const payload = {
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
    icon: parsed.data.icon,
    tag: parsed.data.tag,
  };
  const t = parsed.data.target;
  const result =
    t.kind === 'topic'  ? await broadcastToTopic(t.topic ?? 'all', payload) :
    t.kind === 'member' ? await pushToMember(t.memberId!, payload) :
    await broadcastPush(payload);

  return NextResponse.json({ ok: true, result });
}
