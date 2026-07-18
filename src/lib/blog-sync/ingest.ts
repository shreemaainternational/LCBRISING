/**
 * Ingest pipeline: crawl the Lions newsroom and upsert every article into
 * `public.blog_posts`, idempotently.
 *
 * Runs entirely server-side with the service-role client (bypasses RLS —
 * this is a trusted automation, same posture as the cron/sync workers).
 * Observability reuses the shared `sync_logs` + `audit_logs` tables so a
 * blog crawl shows up in /admin/sync next to every other sync run.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import { slugify, estimateReadingTime } from '@/lib/ai/blog';
import { renderMarkdown } from '@/lib/markdown';
import { crawlNewsroom, resolveConfig } from './lions-newsroom';
import { LIONS_NEWSROOM_SOURCE } from './types';
import type { IngestOptions, IngestResult, ScrapedPost } from './types';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Full run: create a sync_logs row, crawl, upsert each post as it lands,
 * then finalise the log + emit an audit entry. Never throws for a single
 * bad post — failures are counted and surfaced in the result.
 */
export async function runBlogSync(opts: IngestOptions = {}): Promise<IngestResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run blog sync');
  }
  const cfg = resolveConfig(opts.config);
  const supa = createAdminClient();
  const progress = opts.onProgress ?? (() => {});

  const logId = await openLog(supa, opts.triggeredBy ?? null);
  await writeAudit({
    action: 'blog_sync.start',
    entity: 'sync_log',
    entity_id: logId,
    payload: { source: LIONS_NEWSROOM_SOURCE, base_url: cfg.baseUrl },
    actor_member_id: opts.triggeredBy ?? null,
  });

  const counts = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  const failures: { url: string; reason: string }[] = [];
  let discoveredVia: IngestResult['discoveredVia'] = 'pagination';
  let discovered = 0;

  try {
    const crawl = await crawlNewsroom(cfg, async (post, index, total) => {
      try {
        const outcome = await upsertPost(supa, post, { autoPublish: opts.autoPublish ?? false });
        counts[outcome]++;
        progress(`[${index + 1}/${total}] ${outcome.padEnd(8)} ${post.title}`);
      } catch (err) {
        counts.failed++;
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ url: post.url, reason });
        progress(`[${index + 1}/${total}] FAILED   ${post.url} — ${reason}`);
      }
    });

    discovered = crawl.discovered;
    discoveredVia = crawl.discoveredVia;
    // Roll fetch-level failures (network/parse) into the tally.
    for (const f of crawl.failures) {
      counts.failed++;
      failures.push(f);
    }

    await finaliseLog(supa, logId, cfg, {
      discovered,
      discoveredVia,
      ...counts,
      failures,
    });
    await writeAudit({
      action: counts.failed > 0 && counts.inserted + counts.updated > 0 ? 'blog_sync.partial'
        : counts.failed > 0 ? 'blog_sync.failed' : 'blog_sync.success',
      entity: 'sync_log',
      entity_id: logId,
      payload: { discovered, discoveredVia, ...counts },
      actor_member_id: opts.triggeredBy ?? null,
    });

    return { logId, discovered, discoveredVia, ...counts, failures };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supa
      .from('sync_logs')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: message.slice(0, 4000) })
      .eq('id', logId);
    await writeAudit({
      action: 'blog_sync.failed',
      entity: 'sync_log',
      entity_id: logId,
      payload: { error: message },
      actor_member_id: opts.triggeredBy ?? null,
    });
    throw err;
  }
}

/**
 * Idempotent upsert of one scraped post. Returns which mutation happened:
 *   - 'skipped'  → already present and content unchanged
 *   - 'updated'  → existing row, content changed
 *   - 'inserted' → brand-new post
 * A post whose slug collides with a *native* post is imported under a
 * suffixed slug rather than overwriting hand-authored content.
 */
async function upsertPost(
  supa: AdminClient,
  post: ScrapedPost,
  opts: { autoPublish: boolean },
): Promise<'inserted' | 'updated' | 'skipped'> {
  const { data: existing, error: findErr } = await supa
    .from('blog_posts')
    .select('id, content_hash')
    .eq('external_source', LIONS_NEWSROOM_SOURCE)
    .eq('external_id', post.externalId)
    .maybeSingle();
  if (findErr) throw new Error(`lookup failed: ${findErr.message}`);

  const now = new Date().toISOString();
  const bodyMd = post.body ?? post.excerpt ?? '';

  if (existing) {
    if (existing.content_hash === post.contentHash) {
      // Touch last_sync_at so operators can see the crawler is alive.
      await supa.from('blog_posts').update({ last_sync_at: now }).eq('id', existing.id);
      return 'skipped';
    }
    const { error } = await supa
      .from('blog_posts')
      .update({
        ...contentFields(post, bodyMd),
        last_sync_at: now,
      })
      .eq('id', existing.id);
    if (error) throw new Error(`update failed: ${error.message}`);
    return 'updated';
  }

  const slug = await uniqueSlug(supa, post.title, post.externalId);
  const { error } = await supa.from('blog_posts').insert({
    slug,
    external_source: LIONS_NEWSROOM_SOURCE,
    external_id: post.externalId,
    source_url: post.url,
    is_external: true,
    is_published: opts.autoPublish,
    published_at: opts.autoPublish ? post.publishedAt ?? now : post.publishedAt,
    last_sync_at: now,
    ...contentFields(post, bodyMd),
  });
  if (error) throw new Error(`insert failed: ${error.message}`);
  return 'inserted';
}

/** The mutable content columns shared by insert + update. */
function contentFields(post: ScrapedPost, bodyMd: string): Record<string, unknown> {
  return {
    title: post.title,
    excerpt: post.excerpt,
    body: bodyMd || null,
    body_html: bodyMd ? renderMarkdown(bodyMd) : null,
    cover_url: post.coverUrl,
    category: post.category,
    tags: post.tags,
    language: post.language,
    author_name: post.author,
    story_type: 'news',
    reading_time: estimateReadingTime(bodyMd || post.excerpt || post.title),
    content_hash: post.contentHash,
    seo_title: post.title,
    seo_description: post.excerpt,
  };
}

/**
 * Derive a slug from the article path (stable across re-crawls), falling
 * back to the title, and append a numeric suffix on collision.
 */
async function uniqueSlug(supa: AdminClient, title: string, externalId: string): Promise<string> {
  const fromPath = externalId.split('/').filter(Boolean).pop() ?? '';
  const base = slugify(fromPath) || slugify(title) || 'lions-post';
  let candidate = base;
  for (let i = 2; i <= 50; i++) {
    const { data } = await supa.from('blog_posts').select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`.slice(0, 120);
  }
  // Extremely unlikely — fall back to an externalId-derived suffix.
  return `${base}-${slugify(externalId)}`.slice(0, 120);
}

async function openLog(supa: AdminClient, triggeredBy: string | null): Promise<string> {
  const { data, error } = await supa
    .from('sync_logs')
    .insert({
      source: 'rest_api',
      entity: 'blog',
      status: 'running',
      started_at: new Date().toISOString(),
      triggered_by: triggeredBy,
      context: { origin: LIONS_NEWSROOM_SOURCE },
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`failed to open sync_logs row: ${error?.message}`);
  return data.id as string;
}

async function finaliseLog(
  supa: AdminClient,
  logId: string,
  cfg: ReturnType<typeof resolveConfig>,
  r: {
    discovered: number;
    discoveredVia: string;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    failures: { url: string; reason: string }[];
  },
): Promise<void> {
  const status =
    r.failed > 0 && r.inserted + r.updated > 0 ? 'partial'
    : r.failed > 0 ? 'failed'
    : 'success';
  await supa
    .from('sync_logs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      records_total: r.discovered,
      records_inserted: r.inserted,
      records_updated: r.updated,
      records_skipped: r.skipped,
      records_failed: r.failed,
      context: {
        origin: LIONS_NEWSROOM_SOURCE,
        base_url: cfg.baseUrl,
        discovered_via: r.discoveredVia,
        failures: r.failures.slice(0, 50),
      },
    })
    .eq('id', logId);
}
