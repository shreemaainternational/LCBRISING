import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { integrations } from '@/lib/env';
import { runStorySync } from '@/lib/story-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/stories-sync?max=100&publish=1
 *
 * Daily import of Lion Stories from
 * https://www.lionsclubs.org/en/our-impact/our-stories/lion-stories
 * into /stories. Idempotent. Wired in vercel.json; CRON_SECRET auth.
 */
export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!integrations.supabaseAdmin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 503 });
  }
  const url = new URL(req.url);
  const max = Number(url.searchParams.get('max'));
  const publish = url.searchParams.get('publish');
  try {
    const result = await runStorySync({
      maxPosts: Number.isFinite(max) && max > 0 ? max : undefined,
      autoPublish: publish == null ? undefined : publish === '1',
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
