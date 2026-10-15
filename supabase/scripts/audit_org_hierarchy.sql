-- =====================================================================
-- audit_org_hierarchy.sql  (READ-ONLY — changes nothing)
-- Snapshot of the organisational data model as it actually exists in the
-- database: which hierarchy / membership tables and columns are present,
-- row counts, and consistency between members, clubs, zones, regions and
-- districts. Used to plan the club-wise directory and transfer sync.
-- Returns ONE row of JSON so the whole result shows in the workflow log.
-- Run via:
--   Actions -> "Apply database migration (one-shot)"
--   -> sql_path = supabase/scripts/audit_org_hierarchy.sql
-- =====================================================================

with cols as (
  select table_name, jsonb_agg(column_name order by ordinal_position) as columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('members','clubs','zones','regions','districts',
                       'multiple_districts','officers','club_officers',
                       'club_assignment_history','audit_logs','notifications',
                       'member_club_history','membership_history')
  group by table_name
),
counts as (
  select jsonb_object_agg(t, n) as counts from (
    select t, (xpath('/row/c/text()', query_to_xml(
             format('select count(*) as c from public.%I', t), false, true, '')))[1]::text::int as n
    from (select table_name as t from cols) x
  ) y
),
m as (select to_jsonb(x) as j, x.* from public.members x),
c as (select to_jsonb(x) as j, x.* from public.clubs x)
select jsonb_build_object(
  'tables_and_columns', (select jsonb_object_agg(table_name, columns) from cols),
  'row_counts', (select counts from counts),
  'member_role_values', (select jsonb_object_agg(coalesce(k,'null'), n) from (
      select m.j ->> 'role' k, count(*) n from m group by 1) r),
  'member_lions_role_values', (select jsonb_object_agg(coalesce(k,'null'), n) from (
      select m.j ->> 'lions_role' k, count(*) n from m group by 1) r),
  'member_status_values', (select jsonb_object_agg(coalesce(k,'null'), n) from (
      select m.j ->> 'status' k, count(*) n from m group by 1) s),
  'members_deleted', (select count(*) from m where m.j ->> 'deleted_at' is not null),
  'members_without_club', (select count(*) from m where m.club_id is null),
  'members_with_unknown_club', (select count(*) from m
      where m.club_id is not null and not exists (select 1 from public.clubs k where k.id = m.club_id)),
  'members_district_differs_from_club', (select count(*) from m join c on c.id = m.club_id
      where (m.j ->> 'district_id') is not null and (c.j ->> 'district_id') is not null
        and (m.j ->> 'district_id') <> (c.j ->> 'district_id')),
  'members_missing_lions_member_id', (select count(*) from m where coalesce(m.j ->> 'lions_member_id','') = ''),
  'duplicate_lions_member_ids', (select count(*) from (
      select m.j ->> 'lions_member_id' from m where coalesce(m.j ->> 'lions_member_id','') <> ''
      group by 1 having count(*) > 1) d),
  'duplicate_member_emails_ci', (select count(*) from (
      select lower(btrim(m.j ->> 'email')) from m where coalesce(m.j ->> 'email','') <> '' group by 1 having count(*) > 1) d),
  'members_per_club', (select jsonb_agg(jsonb_build_object(
      'club', coalesce(c.name, '(none)'), 'club_number', c.j ->> 'club_number',
      'deleted', c.j ->> 'deleted_at' is not null, 'members', n) order by n desc)
    from (select club_id, count(*) n from public.members group by club_id) g
    left join c on c.id = g.club_id),
  'clubs', (select jsonb_agg(jsonb_build_object(
      'name', c.name, 'club_number', c.j ->> 'club_number', 'district_text', c.j ->> 'district',
      'district_id', c.j ->> 'district_id', 'region_id', c.j ->> 'region_id',
      'zone_id', c.j ->> 'zone_id', 'deleted', c.j ->> 'deleted_at' is not null) order by c.name)
    from c),
  'clubs_region_differs_from_zone', (select count(*) from c
      join public.zones z on z.id::text = c.j ->> 'zone_id'
      where z.region_id is not null and (c.j ->> 'region_id') is distinct from z.region_id::text),
  'clubs_district_differs_from_zone', (select count(*) from c
      join public.zones z on z.id::text = c.j ->> 'zone_id'
      where (c.j ->> 'district_id') is distinct from z.district_id::text),
  'zones_district_differs_from_region', (select count(*) from public.zones z
      join public.regions r on r.id = z.region_id where z.district_id <> r.district_id),
  'districts', (select jsonb_agg(jsonb_build_object('code', d.code, 'name', d.name,
      'lions_year', d.lions_year)) from public.districts d),
  'regions', (select count(*) from public.regions),
  'zones', (select count(*) from public.zones),
  'zones_without_region', (select count(*) from public.zones where region_id is null),
  'audit_member_transfers', (select count(*) from public.audit_logs where action = 'member.transfer')
) as org_audit;
