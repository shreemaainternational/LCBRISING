-- =====================================================================
-- Lions International "Lion Stories" sync
-- ---------------------------------------------------------------------
-- Imports stories from
-- https://www.lionsclubs.org/en/our-impact/our-stories/lion-stories
-- into public.stories so /stories can show them in a separate
-- "From Lions around the world" section. Imported rows carry
-- provenance and link back to the original; the club's own consented
-- beneficiary stories (external_source is null) stay the spotlight.
--
-- Same idempotency model as 0068 (blog sync): keyed on
-- (external_source, external_id); unchanged content_hash skips writes.
-- =====================================================================

alter table public.stories
  add column if not exists external_source text,       -- e.g. 'lions_stories'
  add column if not exists external_id text,           -- source URL path
  add column if not exists source_url text,            -- canonical story URL
  add column if not exists content_hash text,
  add column if not exists last_sync_at timestamptz,
  add column if not exists is_external boolean not null default false;

create unique index if not exists uq_stories_external
  on public.stories(external_source, external_id)
  where external_id is not null;

create index if not exists idx_stories_external_source
  on public.stories(external_source)
  where external_source is not null;

comment on column public.stories.external_source is
  'Origin system for imported stories (null for the club''s own stories). e.g. lions_stories';
