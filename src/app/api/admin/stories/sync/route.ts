import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { integrations } from '@/lib/env';
import { runStorySync, LIONS_STORIES_SOURCE } from '@/lib/story-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const bodySchema = z.object({
  maxPosts: z.coerce.number().int().min(1).max(500).optional(),
  autoPublish: z.boolean().optional(),
});

/**
 * POST /api/admin/stories/sync
 * Import Lion Stories from lionsclubs.org into /stories (admin-only).
 */
export async function POST(req: Request) {
  try {
    const member = await requireAdmin();
    if (!integrations.supabaseAdmin) {
      return NextResponse.json(
        { error: 'Stories sync needs SUPABASE_SERVICE_ROLE_KEY configured on the server.' },
        { status: 503 },
      );
    }
    const parsed = bodySchema.safeParse((await req.json().catch(() => ({}))) ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
    }
    const result = await runStorySync({ ...parsed.data, triggeredBy: member.id });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET /api/admin/stories/sync — imported count + last runs. */
export async function GET() {
  try {
    await requireAdmin();
    const supa = await createClient();
    const [runs, imported] = await Promise.all([
      supa
        .from('sync_logs')
        .select('id, status, started_at, finished_at, records_total, records_inserted, records_updated, records_failed, error_message')
        .eq('entity', 'stories')
        .order('started_at', { ascending: false })
        .limit(10),
      supa
        .from('stories')
        .select('id', { count: 'exact', head: true })
        .eq('external_source', LIONS_STORIES_SOURCE),
    ]);
    return NextResponse.json({ ok: true, runs: runs.data ?? [], importedCount: imported.count ?? 0 });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
