-- =====================================================================
-- Real press-coverage metadata for the `photos` table's existing
-- (previously unused) 'press' category. The public /media page used to
-- ship with six fabricated articles hardcoded in the frontend, falsely
-- attributed to real news outlets. This adds the columns needed to
-- record genuine coverage (outlet name, original link, coverage type)
-- so /media can read real rows instead of invented ones.
-- =====================================================================

alter table public.photos
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists media_type text
    check (media_type is null or media_type in ('Newspaper', 'Online', 'TV'));
