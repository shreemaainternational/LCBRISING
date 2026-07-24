import { NextResponse } from 'next/server';
import { socialPostSchema } from '@/lib/validation/schemas';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { enqueueJob } from '@/lib/automation/engine';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }

  const body = await req.json().catch(() => null);
  const parsed = socialPostSchema.safeParse(normalizeSocialPostBody(body));
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

/**
 * The Quick-add card (admin/social page + socialPreset) posts a different
 * shape than the Creative Builder: a single `platform`, an `image_url` /
 * `image_urls` cover, and a raw `datetime-local` string (e.g. "2026-07-26T10:00").
 * The Creative Builder already sends `platforms`, `media_urls` and an ISO
 * `scheduled_at`. Fold the Quick-add shape onto socialPostSchema so both
 * callers validate — otherwise the card only ever gets `{ error: 'invalid' }`.
 */
function normalizeSocialPostBody(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const b: Record<string, unknown> = { ...(body as Record<string, unknown>) };

  // `platform` (single) → `platforms` (array).
  if (b.platforms == null && typeof b.platform === 'string' && b.platform.trim()) {
    b.platforms = [b.platform];
  }
  delete b.platform;

  // `image_url` / `image_urls` → `media_urls` (merged, de-duped, non-empty).
  const media: string[] = [];
  const push = (u: unknown) => {
    if (typeof u === 'string' && u.trim() && !media.includes(u.trim())) media.push(u.trim());
  };
  if (Array.isArray(b.media_urls)) b.media_urls.forEach(push);
  if (Array.isArray(b.image_urls)) b.image_urls.forEach(push);
  push(b.image_url);
  if (media.length) b.media_urls = media;
  delete b.image_url;
  delete b.image_urls;

  // `scheduled_at`: drop when blank; a bare `datetime-local` value (no
  // timezone) → ISO 8601 so `z.string().datetime()` accepts it.
  if (typeof b.scheduled_at === 'string') {
    const s = b.scheduled_at.trim();
    if (!s) {
      delete b.scheduled_at;
    } else if (!/[zZ]$|[+-]\d\d:?\d\d$/.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) b.scheduled_at = d.toISOString();
    }
  }

  return b;
}
