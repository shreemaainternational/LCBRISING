import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { integrations, blogSyncEnvConfig, blogSyncAutoPublish } from '@/lib/env';
import { runBlogSync } from '@/lib/blog-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Crawling every article can take a while — give it the platform max.
export const maxDuration = 300;

const bodySchema = z.object({
  // Cap the crawl (e.g. a quick 10-post smoke test). 0 / omitted = full.
  maxPosts: z.coerce.number().int().min(0).max(2000).optional(),
  // Publish imported posts immediately instead of leaving them as drafts.
  autoPublish: z.boolean().optional(),
});

/**
 * POST /api/admin/blog/sync
 * Trigger a synchronous crawl of the Lions newsroom and ingest results.
 * Admin-only. Returns the run summary (counts + failures).
 */
export async function POST(req: Request) {
  try {
    const member = await requireAdmin();

    if (!integrations.supabaseAdmin) {
      return NextResponse.json(
        { error: 'Blog sync needs SUPABASE_SERVICE_ROLE_KEY configured on the server.' },
        { status: 503 },
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
    }

    const config = blogSyncEnvConfig();
    if (parsed.data.maxPosts != null) config.maxPosts = parsed.data.maxPosts;

    const result = await runBlogSync({
      config,
      autoPublish: parsed.data.autoPublish ?? blogSyncAutoPublish(),
      triggeredBy: member.id,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/admin/blog/sync
 * Recent blog-crawl runs (from sync_logs) + count of imported posts.
 */
export async function GET() {
  try {
    await requireAdmin();
    const supa = await createClient();

    const [runsRes, importedRes] = await Promise.all([
      supa
        .from('sync_logs')
        .select(
          'id, status, started_at, finished_at, records_total, records_inserted, records_updated, records_skipped, records_failed, context',
        )
        .eq('source', 'rest_api')
        .eq('entity', 'blog')
        .order('started_at', { ascending: false })
        .limit(20),
      supa
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('external_source', 'lions_newsroom'),
    ]);

    return NextResponse.json({
      ok: true,
      runs: runsRes.data ?? [],
      importedCount: importedRes.count ?? 0,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
