import { NextResponse } from 'next/server';
import { socialPostSchema } from '@/lib/validation/schemas';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { enqueueJob } from '@/lib/automation/engine';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }

  const body = await req.json().catch(() => null);
  const parsed = socialPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 });
  }
  const { platforms, scheduled_at, ...rest } = parsed.data;
  const supabase = createAdminClient();
  const isScheduled = scheduled_at && new Date(scheduled_at) > new Date();

  const inserts = platforms.map((p) => ({
    platform: p,
    caption: rest.caption,
    hashtags: rest.hashtags,
    media_urls: rest.media_urls,
    scheduled_at: scheduled_at ?? null,
    status: isScheduled ? 'scheduled' : 'queued',
    creative_id: rest.creative_id ?? null,
    activity_id: rest.activity_id ?? null,
    event_id: rest.event_id ?? null,
    donation_id: rest.donation_id ?? null,
  }));

  const { data: rows, error } = await supabase
    .from('social_posts').insert(inserts).select('id, platform');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For immediate posts, enqueue a job per row
  if (!isScheduled) {
    for (const row of rows ?? []) {
      await enqueueJob('publish_social_post', { post_id: row.id });
    }
  }

  return NextResponse.json({ posts: rows, scheduled: !!isScheduled });
}
