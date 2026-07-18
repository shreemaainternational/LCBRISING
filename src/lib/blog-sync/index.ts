/**
 * Lions newsroom blog sync — public surface.
 *
 * Usage:
 *   import { runBlogSync } from '@/lib/blog-sync';
 *   await runBlogSync({ autoPublish: false, config: { maxPosts: 25 } });
 */
export { runBlogSync } from './ingest';
export {
  crawlNewsroom,
  parseArticle,
  discoverPostUrls,
  resolveConfig,
  isArticleUrl,
  DEFAULT_CRAWL_CONFIG,
} from './lions-newsroom';
export * from './types';
