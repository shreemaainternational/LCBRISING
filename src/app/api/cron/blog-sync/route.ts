import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { integrations, blogSyncEnvConfig, blogSyncAutoPublish } from '@/lib/env';
import { runBlogSync } from '@/lib/blog-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/blog-sync?max=200&publish=0
 *
 * Scheduled crawl of the Lions Clubs International newsroom
 * (https://www.lionsclubs.org/en/blog). Idempotent — content-hash
 * dedup means re-runs only write changed/new posts. Wired in
 * vercel.json (daily). Authenticated with the shared CRON_SECRET.
 */
export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!integrations.supabaseAdmin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const config = blogSyncEnvConfig();
  const maxParam = Number(url.searchParams.get('max'));
  if (Number.isFinite(maxParam) && maxParam > 0) config.maxPosts = maxParam;

  const publishParam = url.searchParams.get('publish');
  const autoPublish = publishParam == null ? blogSyncAutoPublish() : publishParam === '1';

  try {
    const result = await runBlogSync({ config, autoPublish });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
