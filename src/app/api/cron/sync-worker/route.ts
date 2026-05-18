import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { drainQueue } from '@/lib/sync/queue';
import '@/lib/sync'; // register adapters

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/sync-worker?limit=25
 *
 * Drains the sync_queue. Each invocation claims up to `limit` ready
 * jobs and runs them sequentially. Humans can hit it via /admin/sync.
 *
 * No Vercel cron entry — Vercel Hobby allows daily crons only. Wire
 * an external scheduler (cron-job.org, GitHub Actions, an upstream
 * queue trigger, etc.) to GET this URL with the CRON_SECRET, or
 * re-add to vercel.json after upgrading to Vercel Pro.
 */
export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 25));
  const result = await drainQueue(limit);
  return NextResponse.json({ ok: true, ...result });
}
