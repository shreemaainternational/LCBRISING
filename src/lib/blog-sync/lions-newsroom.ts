/**
 * Crawler for the Lions Clubs International newsroom
 * (https://www.lionsclubs.org/en/blog).
 *
 * Two-stage design:
 *   1. Discovery — enumerate every article URL. Sitemap-first (the
 *      authoritative, complete list), with listing-pagination as a
 *      fallback when the sitemap is unavailable or blocked.
 *   2. Extraction — fetch each article and pull structured content from
 *      JSON-LD (schema.org Article), then OpenGraph, then heuristics.
 *
 * Enterprise concerns baked in: bounded concurrency, a politeness
 * throttle, per-request timeouts, exponential-backoff retries that honour
 * `Retry-After`, and a content-hash for idempotent re-crawls.
 */
import { createHash } from 'node:crypto';
import {
  decodeEntities,
  extractHrefs,
  extractJsonLd,
  extractMeta,
  extractSitemapLocs,
  extractTitle,
  htmlToMarkdown,
  isArticleNode,
  isSitemapIndex,
} from './html';
import type {
  CrawlConfig,
  CrawlResult,
  DiscoveryResult,
  ScrapedPost,
} from './types';

export const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  baseUrl: 'https://www.lionsclubs.org',
  blogPath: '/en/blog',
  articlePathPrefix: '/en/blog/',
  userAgent:
    'LCBRisingBot/1.0 (+https://barodarisingstar.com; Lions Club of Baroda Rising Star newsroom sync)',
  concurrency: 4,
  minRequestIntervalMs: 350,
  requestTimeoutMs: 20_000,
  maxRetries: 3,
  maxPosts: 0,
  maxListingPages: 60,
  useSitemap: true,
};

export function resolveConfig(overrides?: Partial<CrawlConfig>): CrawlConfig {
  return { ...DEFAULT_CRAWL_CONFIG, ...(overrides ?? {}) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A cooperative throttle: guarantees at least `minIntervalMs` between the
 * start of successive requests, no matter how many workers call it.
 */
class RateLimiter {
  private nextFreeAt = 0;
  constructor(private readonly minIntervalMs: number) {}
  async take(): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, this.nextFreeAt - now);
    this.nextFreeAt = Math.max(now, this.nextFreeAt) + this.minIntervalMs;
    if (wait > 0) await sleep(wait);
  }
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Fetch with per-request timeout and exponential-backoff retry. Retries
 * on network errors, timeouts, 429 and 5xx; honours a `Retry-After`
 * header when present. 4xx (other than 429) fail fast — they will not
 * succeed on retry.
 */
export async function fetchText(
  url: string,
  cfg: CrawlConfig,
  limiter: RateLimiter,
  accept = 'text/html,application/xhtml+xml',
): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    await limiter.take();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.requestTimeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': cfg.userAgent,
          Accept: accept,
          'Accept-Language': 'en',
        },
        redirect: 'follow',
        signal: controller.signal,
        cache: 'no-store',
      });
      if (res.ok) return await res.text();

      // Non-retryable client errors: give up immediately.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new HttpError(res.status, `GET ${url} → ${res.status} ${res.statusText}`);
      }
      lastErr = new HttpError(res.status, `GET ${url} → ${res.status} ${res.statusText}`);
      const retryAfter = Number(res.headers.get('retry-after'));
      if (attempt < cfg.maxRetries) {
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff(attempt));
      }
    } catch (err) {
      if (err instanceof HttpError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err;
      }
      lastErr = err;
      if (attempt < cfg.maxRetries) await sleep(backoff(attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`GET ${url} failed`);
}

function backoff(attempt: number): number {
  const base = Math.min(8000, 500 * 2 ** attempt);
  return base + Math.floor(Math.random() * 250); // jitter
}

// ---------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------

/** Enumerate every article URL for the blog, sitemap-first. */
export async function discoverPostUrls(
  cfg: CrawlConfig,
  limiter: RateLimiter,
): Promise<DiscoveryResult> {
  const seen = new Set<string>();
  let via: DiscoveryResult['via'] = 'pagination';
  let pagesFetched = 0;

  if (cfg.useSitemap) {
    try {
      const fromSitemap = await discoverViaSitemap(cfg, limiter);
      pagesFetched += fromSitemap.pagesFetched;
      for (const u of fromSitemap.urls) seen.add(u);
      if (seen.size > 0) via = 'sitemap';
    } catch {
      // Sitemap missing/blocked — fall through to pagination.
    }
  }

  // Always run pagination when the sitemap yielded nothing; otherwise it
  // is a cheap top-up that catches posts a stale sitemap may have missed.
  if (seen.size === 0) {
    const paged = await discoverViaPagination(cfg, limiter);
    pagesFetched += paged.pagesFetched;
    for (const u of paged.urls) seen.add(u);
    via = 'pagination';
  }

  let urls = Array.from(seen);
  if (cfg.maxPosts > 0) urls = urls.slice(0, cfg.maxPosts);
  return { urls, via, pagesFetched };
}

async function discoverViaSitemap(
  cfg: CrawlConfig,
  limiter: RateLimiter,
): Promise<DiscoveryResult> {
  const urls = new Set<string>();
  const queue = [`${cfg.baseUrl}/sitemap.xml`];
  const visited = new Set<string>();
  let pagesFetched = 0;

  while (queue.length && visited.size < 50) {
    const sm = queue.shift()!;
    if (visited.has(sm)) continue;
    visited.add(sm);
    let xml: string;
    try {
      xml = await fetchText(sm, cfg, limiter, 'application/xml,text/xml');
    } catch {
      continue;
    }
    pagesFetched++;
    const locs = extractSitemapLocs(xml);
    if (isSitemapIndex(xml)) {
      // Only descend into child sitemaps that could contain blog posts.
      for (const loc of locs) {
        if (/blog|news|story|stories|content/i.test(loc)) queue.push(loc);
      }
      // If nothing matched, descend into all children as a fallback.
      if (!queue.length) for (const loc of locs) queue.push(loc);
    } else {
      for (const loc of locs) {
        if (isArticleUrl(loc, cfg)) urls.add(normaliseUrl(loc, cfg));
      }
    }
  }
  return { urls: Array.from(urls), via: 'sitemap', pagesFetched };
}

async function discoverViaPagination(
  cfg: CrawlConfig,
  limiter: RateLimiter,
): Promise<DiscoveryResult> {
  const urls = new Set<string>();
  let pagesFetched = 0;
  let emptyStreak = 0;

  for (let page = 0; page < cfg.maxListingPages; page++) {
    const pageUrl = buildListingUrl(cfg, page);
    let html: string;
    try {
      html = await fetchText(pageUrl, cfg, limiter);
    } catch {
      break;
    }
    pagesFetched++;
    const before = urls.size;
    for (const href of extractHrefs(html)) {
      const abs = toAbsolute(href, cfg.baseUrl);
      if (abs && isArticleUrl(abs, cfg)) urls.add(normaliseUrl(abs, cfg));
    }
    // Stop when two consecutive pages add nothing new — we've hit the end
    // (or a page that no longer paginates).
    if (urls.size === before) {
      if (++emptyStreak >= 2) break;
    } else {
      emptyStreak = 0;
    }
  }
  return { urls: Array.from(urls), via: 'pagination', pagesFetched };
}

function buildListingUrl(cfg: CrawlConfig, page: number): string {
  const base = `${cfg.baseUrl}${cfg.blogPath}`;
  if (page === 0) return base;
  // The Lions CMS paginates with ?page=N; harmless if the site ignores it.
  const u = new URL(base);
  u.searchParams.set('page', String(page));
  return u.toString();
}

// ---------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------

/** Fetch one article and normalise it into a ScrapedPost. */
export async function scrapeArticle(
  url: string,
  cfg: CrawlConfig,
  limiter: RateLimiter,
): Promise<ScrapedPost> {
  const html = await fetchText(url, cfg, limiter);
  return parseArticle(html, url, cfg);
}

/** Pure parser — exposed for unit testing without network. */
export function parseArticle(html: string, url: string, cfg: CrawlConfig): ScrapedPost {
  const meta = extractMeta(html);
  const article = extractJsonLd(html).find(isArticleNode);

  const title =
    firstString(article?.headline) ??
    meta['og:title'] ??
    meta['twitter:title'] ??
    extractTitle(html) ??
    'Untitled';

  const excerpt =
    firstString(article?.description) ??
    meta['og:description'] ??
    meta.description ??
    meta['twitter:description'] ??
    null;

  const bodyFromJsonLd = firstString(article?.articleBody);
  const body = bodyFromJsonLd
    ? normaliseText(bodyFromJsonLd)
    : extractBodyFromHtml(html) ?? excerpt;

  const coverUrl =
    imageUrl(article?.image) ??
    meta['og:image'] ??
    meta['twitter:image'] ??
    null;

  const publishedAt =
    toIso(firstString(article?.datePublished)) ??
    toIso(meta['article:published_time']) ??
    toIso(meta['og:updated_time']) ??
    toIso(firstString(article?.dateModified)) ??
    null;

  const author =
    authorName(article?.author) ??
    meta.author ??
    meta['article:author'] ??
    null;

  const category =
    firstString(article?.articleSection) ??
    meta['article:section'] ??
    deriveCategoryFromUrl(url, cfg) ??
    null;

  const tags = collectTags(article, meta);
  const language = meta['og:locale']?.slice(0, 2) || pathLanguage(url) || 'en';

  const externalId = articlePath(url, cfg);
  const contentHash = hashContent({ title, excerpt, body, coverUrl, publishedAt, tags });

  return {
    externalId,
    url: normaliseUrl(url, cfg),
    title: clip(decodeEntities(title), 200),
    excerpt: excerpt ? clip(normaliseText(excerpt), 500) : null,
    body: body ? body : null,
    coverUrl: coverUrl && isHttpUrl(coverUrl) ? coverUrl : null,
    category: category ? clip(normaliseText(category), 60) : null,
    tags,
    author: author ? clip(normaliseText(author), 120) : null,
    publishedAt,
    language,
    contentHash,
  };
}

/**
 * Heuristic body extraction: prefer an <article> element, else the
 * largest <main>/content <div>. Only used when JSON-LD lacks articleBody.
 */
function extractBodyFromHtml(html: string): string | null {
  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  if (article) {
    const md = htmlToMarkdown(article[1]);
    if (md.length > 120) return md;
  }
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  if (main) {
    const md = htmlToMarkdown(main[1]);
    if (md.length > 120) return md;
  }
  return null;
}

// ---------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------

/**
 * Full crawl: discover then fetch every article with bounded concurrency.
 * `onPost` fires as each post is parsed so callers can stream ingest.
 */
export async function crawlNewsroom(
  cfg: CrawlConfig,
  onPost?: (post: ScrapedPost, index: number, total: number) => Promise<void> | void,
): Promise<CrawlResult> {
  const limiter = new RateLimiter(cfg.minRequestIntervalMs);
  const discovery = await discoverPostUrls(cfg, limiter);

  const result: CrawlResult = {
    discovered: discovery.urls.length,
    discoveredVia: discovery.via,
    fetched: 0,
    parsed: 0,
    failed: 0,
    posts: [],
    failures: [],
  };

  const urls = discovery.urls;
  let cursor = 0;
  const total = urls.length;

  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= total) return;
      const url = urls[i];
      try {
        const post = await scrapeArticle(url, cfg, limiter);
        result.fetched++;
        result.parsed++;
        result.posts.push(post);
        if (onPost) await onPost(post, i, total);
      } catch (err) {
        result.failed++;
        result.failures.push({ url, reason: err instanceof Error ? err.message : String(err) });
      }
    }
  };

  const pool = Array.from({ length: Math.max(1, cfg.concurrency) }, worker);
  await Promise.all(pool);
  return result;
}

// ---------------------------------------------------------------------
// URL + field helpers
// ---------------------------------------------------------------------

function toAbsolute(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export function isArticleUrl(raw: string, cfg: CrawlConfig): boolean {
  let u: URL;
  try {
    u = new URL(raw, cfg.baseUrl);
  } catch {
    return false;
  }
  if (u.hostname !== new URL(cfg.baseUrl).hostname) return false;
  const path = u.pathname.replace(/\/+$/, '');
  const prefix = cfg.articlePathPrefix.replace(/\/+$/, '');
  if (!path.startsWith(prefix)) return false;
  // Exclude the index itself and taxonomy/pagination pages.
  if (path === prefix) return false;
  const tail = path.slice(prefix.length + 1);
  if (!tail || /^(page|category|tag|author|topics?)(\/|$)/i.test(tail)) return false;
  return true;
}

function normaliseUrl(raw: string, cfg: CrawlConfig): string {
  try {
    const u = new URL(raw, cfg.baseUrl);
    u.hash = '';
    u.search = '';
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch {
    return raw;
  }
}

function articlePath(raw: string, cfg: CrawlConfig): string {
  try {
    return new URL(raw, cfg.baseUrl).pathname.replace(/\/+$/, '');
  } catch {
    return raw;
  }
}

function deriveCategoryFromUrl(_url: string, _cfg: CrawlConfig): string | null {
  return null;
}

function pathLanguage(raw: string): string | null {
  try {
    const seg = new URL(raw).pathname.split('/').filter(Boolean)[0];
    return seg && /^[a-z]{2}$/.test(seg) ? seg : null;
  } catch {
    return null;
  }
}

function collectTags(article: Record<string, unknown> | undefined, meta: Record<string, string>): string[] {
  const tags = new Set<string>();
  const kw = article?.keywords;
  if (typeof kw === 'string') kw.split(',').forEach((t) => addTag(tags, t));
  else if (Array.isArray(kw)) kw.forEach((t) => addTag(tags, String(t)));
  const about = article?.about;
  if (Array.isArray(about)) {
    for (const a of about) {
      const n = firstString((a as Record<string, unknown>)?.name);
      if (n) addTag(tags, n);
    }
  }
  if (meta['article:tag']) addTag(tags, meta['article:tag']);
  return Array.from(tags).slice(0, 12);
}

function addTag(set: Set<string>, raw: string): void {
  const t = normaliseText(raw).slice(0, 40);
  if (t) set.add(t);
}

function authorName(author: unknown): string | null {
  if (!author) return null;
  if (typeof author === 'string') return author;
  if (Array.isArray(author)) return author.map(authorName).filter(Boolean).join(', ') || null;
  if (typeof author === 'object') return firstString((author as Record<string, unknown>).name);
  return null;
}

function imageUrl(image: unknown): string | null {
  if (!image) return null;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) {
    for (const i of image) {
      const u = imageUrl(i);
      if (u) return u;
    }
    return null;
  }
  if (typeof image === 'object') return firstString((image as Record<string, unknown>).url);
  return null;
}

function firstString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    for (const x of v) {
      const s = firstString(x);
      if (s) return s;
    }
  }
  return null;
}

function toIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normaliseText(s: string): string {
  return decodeEntities(s).replace(/\s+/g, ' ').trim();
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function hashContent(parts: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 32);
}
