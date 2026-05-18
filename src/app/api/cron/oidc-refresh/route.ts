/**
 * Proactive OIDC token rotation.
 *
 * Walks every oauth_accounts row whose access_token_expires_at is
 * within the configured leeway (default 10 minutes) and has a
 * refresh_token, and rotates the access token via the IdP. The
 * existing /api/auth/oidc/refresh endpoint covers the on-demand
 * case; this cron handles the silent-prefetch case so adapters
 * never have to wait for a token roundtrip on the hot path.
 *
 * Schedule externally (cron-job.org / GitHub Actions / Vercel Pro
 * cron) — every 5 minutes works well with a 10-minute leeway.
 */
import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/oidc/auto-refresh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const leeway = Math.max(60, Number(url.searchParams.get('leeway_seconds')) || 600);
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 100));
  const horizon = new Date(Date.now() + leeway * 1000).toISOString();

  const db = createAdminClient();
  const { data: rows, error } = await db
    .from('oauth_accounts')
    .select('id, provider, access_token_expires_at')
    .not('refresh_token', 'is', null)
    .lte('access_token_expires_at', horizon)
    .order('access_token_expires_at', { ascending: true })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rotated = 0, skipped = 0;
  const failures: { id: string; reason: string }[] = [];
  for (const row of rows ?? []) {
    try {
      const r = await getValidAccessToken(row.id as string, leeway);
      if (r.rotated) rotated++; else skipped++;
    } catch (e) {
      failures.push({ id: row.id as string, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({
    ok: true,
    examined: rows?.length ?? 0,
    rotated,
    skipped,
    failed: failures.length,
    failures: failures.slice(0, 20),
    horizon,
  });
}
