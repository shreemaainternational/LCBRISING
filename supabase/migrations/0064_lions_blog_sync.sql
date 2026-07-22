-- =====================================================================
-- Lions newsroom blog sync
-- ---------------------------------------------------------------------
-- Adds provenance columns to blog_posts so externally-scraped articles
-- (e.g. the Lions Clubs International newsroom at
-- https://www.lionsclubs.org/en/blog) can be ingested idempotently.
--
-- The sync pipeline keys on (external_source, external_id) and skips
-- writes when content_hash is unchanged, so re-running the crawler is
-- cheap and never produces duplicates. Reuses the existing sync_logs /
-- audit_logs tables for observability (source='rest_api', entity='blog').
-- =====================================================================

alter table public.blog_posts
  add column if not exists external_source text,       -- e.g. 'lions_newsroom'
  add column if not exists external_id text,           -- stable id from the source (url path / guid)
  add column if not exists source_url text,            -- canonical article URL
  add column if not exists content_hash text,          -- change-detection fingerprint
  add column if not exists last_sync_at timestamptz,   -- last successful crawl
  add column if not exists is_external boolean not null default false;

-- One row per external article. Partial unique index keeps native
-- (hand-authored) posts — which have NULL external_id — unconstrained.
create unique index if not exists uq_blog_posts_external
  on public.blog_posts(external_source, external_id)
  where external_id is not null;

create index if not exists idx_blog_posts_external_source
  on public.blog_posts(external_source)
  where external_source is not null;

comment on column public.blog_posts.external_source is
  'Origin system for imported posts (null for native posts). e.g. lions_newsroom';
comment on column public.blog_posts.external_id is
  'Stable identifier of the post in the origin system; unique per external_source.';
comment on column public.blog_posts.content_hash is
  'Fingerprint of the scraped content; unchanged hash short-circuits re-writes.';
