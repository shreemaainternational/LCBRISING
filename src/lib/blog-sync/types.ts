/**
 * Shared types for the Lions newsroom blog crawler + ingest pipeline.
 */

export const LIONS_NEWSROOM_SOURCE = 'lions_newsroom';

/** A single article extracted from the source, normalised for ingest. */
export interface ScrapedPost {
  /** Stable id in the origin system — the article URL's path. */
  externalId: string;
  /** Canonical article URL. */
  url: string;
  title: string;
  excerpt: string | null;
  /** Markdown body (best-effort). */
  body: string | null;
  coverUrl: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
  /** ISO timestamp or null when the source omits it. */
  publishedAt: string | null;
  language: string;
  /** Fingerprint used for change detection on re-crawl. */
  contentHash: string;
}

export interface CrawlConfig {
  /** Origin, e.g. https://www.lionsclubs.org */
  baseUrl: string;
  /** Blog index path, e.g. /en/blog */
  blogPath: string;
  /** Only ingest URLs whose path starts with this prefix. */
  articlePathPrefix: string;
  userAgent: string;
  /** Max concurrent in-flight article fetches. */
  concurrency: number;
  /** Min delay (ms) between successive requests — politeness throttle. */
  minRequestIntervalMs: number;
  /** Per-request timeout (ms). */
  requestTimeoutMs: number;
  /** Retry attempts on transient (5xx / network / timeout) failures. */
  maxRetries: number;
  /** Hard cap on articles fetched in a single run (0 = unlimited). */
  maxPosts: number;
  /** Stop paginating the listing after this many pages (safety valve). */
  maxListingPages: number;
  /** Prefer sitemap.xml discovery before falling back to pagination. */
  useSitemap: boolean;
}

export interface DiscoveryResult {
  urls: string[];
  /** Where the URLs came from — for observability. */
  via: 'sitemap' | 'pagination' | 'mixed';
  pagesFetched: number;
}

export interface CrawlResult {
  discovered: number;
  discoveredVia: DiscoveryResult['via'];
  fetched: number;
  parsed: number;
  failed: number;
  posts: ScrapedPost[];
  failures: { url: string; reason: string }[];
}

export interface IngestOptions {
  /** Override any subset of the default crawl config. */
  config?: Partial<CrawlConfig>;
  /** Publish freshly-imported posts immediately (default: keep as draft). */
  autoPublish?: boolean;
  /** Member id that triggered the run (for audit + sync_logs). */
  triggeredBy?: string | null;
  /** Progress callback (used by the CLI for live output). */
  onProgress?: (msg: string) => void;
}

export interface IngestResult {
  logId: string | null;
  discovered: number;
  discoveredVia: DiscoveryResult['via'];
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: { url: string; reason: string }[];
}
