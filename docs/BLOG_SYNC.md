# Lions Newsroom Blog Sync

Enterprise automation that crawls the **Lions Clubs International newsroom**
(<https://www.lionsclubs.org/en/blog>) and imports every article into
`public.blog_posts`. Idempotent, observable, and runnable from three
surfaces (scheduled cron, admin UI, CLI).

---

## What it does

1. **Discover** every article URL — sitemap-first (authoritative + complete),
   falling back to listing pagination when the sitemap is missing or blocked.
2. **Extract** each article's content, preferring structured metadata:
   `schema.org` JSON-LD (`Article` / `BlogPosting` / `NewsArticle`) →
   OpenGraph / `<meta>` tags → heuristic `<article>`/`<main>` body.
3. **Upsert** into `blog_posts` keyed on `(external_source, external_id)`.
   A per-post `content_hash` short-circuits unchanged posts, so re-runs only
   write what actually changed — no duplicates, ever.

Imported posts are marked `is_external = true`, `external_source =
'lions_newsroom'`, and (by default) land as **drafts** for editorial review
before publishing.

## Architecture

| Piece | Path |
|-------|------|
| HTML utilities (zero-dep) | `src/lib/blog-sync/html.ts` |
| Crawler (discover + extract) | `src/lib/blog-sync/lions-newsroom.ts` |
| Ingest pipeline (upsert + logging) | `src/lib/blog-sync/ingest.ts` |
| Admin trigger + status API | `src/app/api/admin/blog/sync/route.ts` |
| Scheduled cron | `src/app/api/cron/blog-sync/route.ts` |
| CLI backfill | `scripts/lions-blog-sync.ts` (`npm run blog:sync`) |
| Schema | `supabase/migrations/0063_lions_blog_sync.sql` |

**Observability** reuses the shared `sync_logs` + `audit_logs` tables
(`source='rest_api'`, `entity='blog'`), so every crawl appears in
`/admin/sync` alongside CRM syncs, with insert / update / skip / fail counts.

**Resilience**: bounded concurrency, a politeness throttle, per-request
timeouts, and exponential-backoff retries that honour `Retry-After`. A single
bad article is counted as a failure and never aborts the run.

## Running it

### Scheduled (default)
`vercel.json` runs `/api/cron/blog-sync` daily at 02:00 UTC, authenticated
with `CRON_SECRET`. Override per-invocation with `?max=200&publish=1`.

### Admin UI
`/admin/blog` → **Sync Lions blog**. Runs synchronously and reports the
summary inline. Safe to click repeatedly.

### CLI
```bash
npm run blog:sync            # full crawl, import as drafts
npm run blog:sync -- --max=10    # first 10 posts (smoke test)
npm run blog:sync -- --publish   # publish on import
npm run blog:sync -- --dry       # crawl + print only, no DB writes
```
Requires `SUPABASE_SERVICE_ROLE_KEY` (+ `NEXT_PUBLIC_SUPABASE_URL`) in the
environment or `.env.local`.

## Configuration

All optional — sensible defaults are baked into `DEFAULT_CRAWL_CONFIG`.

| Env var | Default | Purpose |
|---------|---------|---------|
| `LIONS_BLOG_BASE_URL` | `https://www.lionsclubs.org` | Origin |
| `LIONS_BLOG_PATH` | `/en/blog` | Listing path + article prefix |
| `LIONS_BLOG_USER_AGENT` | `LCBRisingBot/1.0 …` | Crawler UA |
| `LIONS_BLOG_CONCURRENCY` | `4` | Concurrent fetches (1–16) |
| `LIONS_BLOG_MAX_POSTS` | `0` (all) | Cap posts per run |
| `LIONS_BLOG_AUTOPUBLISH` | unset | `1` publishes on import |

## Notes

- **Politeness / legal**: the crawler identifies itself via a descriptive
  User-Agent and throttles requests. Confirm your use of Lions Clubs
  International content complies with their terms before publishing imported
  posts publicly; keeping `LIONS_BLOG_AUTOPUBLISH` off (drafts) is the safe
  default and gives editors a review gate.
- **Prod runtime**: crawls can exceed Vercel Hobby's 60s function limit for a
  full backfill. Do the initial backfill via the CLI (`npm run blog:sync`),
  then let the daily incremental cron keep it fresh — incremental runs write
  only changed posts and finish quickly.
