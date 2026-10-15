-- =====================================================================
-- audit_duplicate_activities.sql  (READ-ONLY — changes nothing)
-- For every activity with an empty description that has another record
-- with the same title and date, shows the filled sibling and everything
-- that would need to move before the empty copy could be removed:
-- category, photos, Lions report link and rows in other tables that
-- reference it (found from the live foreign keys, not a fixed list).
-- Run via:
--   Actions -> "Apply database migration (one-shot)"
--   -> sql_path = supabase/scripts/audit_duplicate_activities.sql
-- =====================================================================

with fks as (
  select c.conrelid::regclass::text as tbl, a.attname as col
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  where c.contype = 'f'
    and c.confrelid = 'public.activities'::regclass
    and array_length(c.conkey, 1) = 1
),
empties as (
  select e.*
  from public.activities e
  where coalesce(btrim(e.description), '') = ''
    and exists (
      select 1 from public.activities s
      where s.id <> e.id
        and lower(btrim(s.title)) = lower(btrim(e.title))
        and s.date = e.date
        and coalesce(btrim(s.description), '') <> '')
)
select
  e.date,
  e.title,
  e.id                                         as empty_id,
  e.category                                   as empty_category,
  e.approval_status::text                      as empty_status,
  e.lions_report_id                            as empty_lions_report_id,
  cardinality(e.photos) + cardinality(e.before_photos)
    + cardinality(e.after_photos) + cardinality(e.videos) as empty_media,
  (e.beneficiaries = 0 and e.lion_members_count = 0
    and coalesce(e.service_hours, 0) = 0
    and coalesce(e.amount_raised, 0) = 0)      as empty_figures_zero,
  (select string_agg(f.tbl || '.' || f.col || '=' || n.cnt, ', ')
     from fks f,
     lateral (select (xpath('/row/c/text()', query_to_xml(
        format('select count(*) as c from %s where %I = %L', f.tbl, f.col, e.id),
        false, true, '')))[1]::text::int as cnt) n
    where n.cnt > 0)                           as empty_references,
  (select count(*) from public.activities s
    where s.id <> e.id
      and lower(btrim(s.title)) = lower(btrim(e.title))
      and s.date = e.date
      and coalesce(btrim(s.description), '') <> '') as filled_siblings,
  f.id                                         as filled_id,
  f.category                                   as filled_category,
  f.approval_status::text                      as filled_status,
  f.lions_report_id                            as filled_lions_report_id,
  cardinality(f.photos)                        as filled_photos
from empties e
left join lateral (
  select s.* from public.activities s
  where s.id <> e.id
    and lower(btrim(s.title)) = lower(btrim(e.title))
    and s.date = e.date
    and coalesce(btrim(s.description), '') <> ''
  order by length(btrim(s.description)) desc
  limit 1) f on true
order by e.date, e.title, e.id;
