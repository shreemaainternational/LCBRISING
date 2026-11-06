/**
 * Lions International "Lion Stories" sync →
 * `public.stories` (migration 0082).
 *
 * Source: https://www.lionsclubs.org/en/our-impact/our-stories/lion-stories
 *
 * Reuses the newsroom crawler (sitemap-first discovery, listing
 * pagination fallback, JSON-LD/OpenGraph extraction, throttling and
 * retries) with a stories-specific config. Imported rows are stored as
 * link-outs: title, summary, image and a `source_url` back to
 * lionsclubs.org — the full article text is not republished. They are
 * shown on /stories in a separate "From Lions around the world" section,
 * never mixed in with the club's own consented beneficiary stories.
 *
 * Idempotent: keyed on (external_source, external_id); an unchanged
 * content_hash skips the write.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import { slugify } from '@/lib/ai/blog';
import { crawlNewsroom, resolveConfig } from '@/lib/blog-sync/lions-newsroom';
import type { CrawlConfig, ScrapedPost } from '@/lib/blog-sync/types';

export const LIONS_STORIES_SOURCE = 'lions_stories';

export const LIONS_STORIES_LISTING_PATH = '/en/our-impact/our-stories/lion-stories';

// Stories are usually nested under the listing; if the site files them
// elsewhere in the our-stories section, the broader prefix catches them.
const NARROW_PREFIX = `${LIONS_STORIES_LISTING_PATH}/`;
const BROAD_PREFIX = '/en/our-impact/our-stories/';

// Hub/index pages inside the our-stories section that are not stories.
const INDEX_PATHS = ['/en/our-impact/our-stories', LIONS_STORIES_LISTING_PATH];

type AdminClient = ReturnType<typeof createAdminClient>;

export type StorySyncOptions = {
  maxPosts?: number;
  /** Publish new imports immediately (default true — they are labelled and link out). */
  autoPublish?: boolean;
  /** Override the article path prefix (env LIONS_STORIES_ARTICLE_PREFIX). */
  articlePathPrefix?: string;
  triggeredBy?: string | null;
};

export type StorySyncResult = {
  logId: string | null;
  discovered: number;
  discoveredVia: string;
  articlePathPrefix: string;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: { url: string; reason: string }[];
};

function storiesConfig(prefix: string, maxPosts: number): Partial<CrawlConfig> {
  return {
    blogPath: LIONS_STORIES_LISTING_PATH,
    articlePathPrefix: prefix,
    excludePaths: INDEX_PATHS,
    maxPosts,
    // Stories are a smaller section; keep runs well inside maxDuration.
    maxListingPages: 20,
  };
}

export async function runStorySync(opts: StorySyncOptions = {}): Promise<StorySyncResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run the stories sync');
  }
  const supa = createAdminClient();
  const autoPublish = opts.autoPublish ?? true;
  const maxPosts = opts.maxPosts ?? 100;
  const envPrefix = process.env.LIONS_STORIES_ARTICLE_PREFIX?.trim();
  const prefixes = opts.articlePathPrefix
    ? [opts.articlePathPrefix]
    : envPrefix
      ? [envPrefix]
      : [NARROW_PREFIX, BROAD_PREFIX];

  const logId = await openLog(supa, opts.triggeredBy ?? null);
  const counts = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  const failures: { url: string; reason: string }[] = [];
  let discovered = 0;
  let discoveredVia = 'pagination';
  let usedPrefix = prefixes[0];

  try {
    for (const prefix of prefixes) {
      usedPrefix = prefix;
      const cfg = resolveConfig(storiesConfig(prefix, maxPosts));
      const crawl = await crawlNewsroom(cfg, async (post) => {
        try {
          counts[await upsertStory(supa, post, autoPublish)]++;
        } catch (err) {
          counts.failed++;
          failures.push({ url: post.url, reason: err instanceof Error ? err.message : String(err) });
        }
      });
      discovered = crawl.discovered;
      discoveredVia = crawl.discoveredVia;
      for (const f of crawl.failures) {
        counts.failed++;
        failures.push(f);
      }
      if (discovered > 0) break;
    }

    const status =
      counts.failed > 0 && counts.inserted + counts.updated > 0 ? 'partial'
      : counts.failed > 0 || discovered === 0 ? 'failed'
      : 'success';
    await supa
      .from('sync_logs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        records_total: discovered,
        records_inserted: counts.inserted,
        records_updated: counts.updated,
        records_skipped: counts.skipped,
        records_failed: counts.failed,
        error_message:
          discovered === 0
            ? `No story URLs found under ${prefixes.join(' or ')} — set LIONS_STORIES_ARTICLE_PREFIX`
            : null,
        context: {
          origin: LIONS_STORIES_SOURCE,
          article_path_prefix: usedPrefix,
          discovered_via: discoveredVia,
          failures: failures.slice(0, 50),
        },
      })
      .eq('id', logId);
    await writeAudit({
      action: `story_sync.${status}`,
      entity: 'sync_log',
      entity_id: logId,
      payload: { discovered, discoveredVia, prefix: usedPrefix, ...counts },
      actor_member_id: opts.triggeredBy ?? null,
    });

    return {
      logId,
      discovered,
      discoveredVia,
      articlePathPrefix: usedPrefix,
      ...counts,
      failures,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supa
      .from('sync_logs')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: message.slice(0, 4000) })
      .eq('id', logId);
    throw err;
  }
}

async function upsertStory(
  supa: AdminClient,
  post: ScrapedPost,
  autoPublish: boolean,
): Promise<'inserted' | 'updated' | 'skipped'> {
  const { data: existing, error: findErr } = await supa
    .from('stories')
    .select('id, content_hash')
    .eq('external_source', LIONS_STORIES_SOURCE)
    .eq('external_id', post.externalId)
    .maybeSingle();
  if (findErr) throw new Error(`lookup failed: ${findErr.message}`);

  const now = new Date().toISOString();
  const fields = {
    title: post.title,
    subtitle: post.excerpt,
    hero_image: post.coverUrl,
    tags: post.tags,
    source_url: post.url,
    content_hash: post.contentHash,
    last_sync_at: now,
  };

  if (existing) {
    if (existing.content_hash === post.contentHash) {
      await supa.from('stories').update({ last_sync_at: now }).eq('id', existing.id);
      return 'skipped';
    }
    // Content only — never flip an editor's publish/unpublish decision.
    const { error } = await supa.from('stories').update(fields).eq('id', existing.id);
    if (error) throw new Error(`update failed: ${error.message}`);
    return 'updated';
  }

  const slug = await uniqueSlug(supa, post);
  const { error } = await supa.from('stories').insert({
    ...fields,
    slug,
    external_source: LIONS_STORIES_SOURCE,
    external_id: post.externalId,
    is_external: true,
    is_featured: false,
    is_published: autoPublish,
    published_at: post.publishedAt ?? now,
  });
  if (error) throw new Error(`insert failed: ${error.message}`);
  return 'inserted';
}

async function uniqueSlug(supa: AdminClient, post: ScrapedPost): Promise<string> {
  const fromPath = post.externalId.split('/').filter(Boolean).pop() ?? '';
  const base = `lions-${slugify(fromPath) || slugify(post.title) || 'story'}`.slice(0, 110);
  let candidate = base;
  for (let i = 2; i <= 50; i++) {
    const { data } = await supa.from('stories').select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function openLog(supa: AdminClient, triggeredBy: string | null): Promise<string> {
  const { data, error } = await supa
    .from('sync_logs')
    .insert({
      source: 'rest_api',
      entity: 'stories',
      status: 'running',
      started_at: new Date().toISOString(),
      triggered_by: triggeredBy,
      context: { origin: LIONS_STORIES_SOURCE },
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`failed to open sync_logs row: ${error?.message}`);
  return data.id as string;
}
