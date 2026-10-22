-- =====================================================================
-- list_org_units.sql  (READ-ONLY — changes nothing)
-- Districts, regions and zones with their ids and links, and the live
-- club count per zone — used to pick ids for hierarchy changes.
-- Run via: Actions -> "Apply database migration (one-shot)"
--   -> sql_path = supabase/scripts/list_org_units.sql
-- =====================================================================
select jsonb_build_object(
  'districts', (select jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name) order by code)
                from public.districts where deleted_at is null),
  'regions',   (select jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name, 'district_id', district_id) order by code)
                from public.regions where deleted_at is null),
  'zones',     (select jsonb_agg(jsonb_build_object('id', z.id, 'code', z.code, 'name', z.name,
                  'region_id', z.region_id, 'district_id', z.district_id,
                  'live_clubs', (select count(*) from public.clubs c where c.zone_id = z.id and c.deleted_at is null))
                  order by z.code)
                from public.zones z where z.deleted_at is null)
) as org_units;
