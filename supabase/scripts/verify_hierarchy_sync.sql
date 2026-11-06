-- =====================================================================
-- verify_hierarchy_sync.sql  (READ-ONLY — changes nothing)
-- After migration 0088: assignment history counts, drift / gaps from
-- org_hierarchy_drift(), and every region and zone including soft-deleted
-- ones (deleted_at shown), so hierarchy decisions use the full picture.
-- Run via: Actions -> "Apply database migration (one-shot)"
--   -> sql_path = supabase/scripts/verify_hierarchy_sync.sql
-- =====================================================================
select jsonb_build_object(
  'assignments', (select jsonb_build_object(
      'total', count(*),
      'current', count(*) filter (where effective_to is null),
      'by_source', (select jsonb_object_agg(source, n) from (
          select source, count(*) n from public.member_club_assignments group by source) s))
    from public.member_club_assignments),
  'members_with_club', (select count(*) from public.members where club_id is not null and deleted_at is null),
  'drift', (select jsonb_agg(jsonb_build_object('entity', entity, 'name', entity_name,
                'field', field, 'fixable', fixable) order by fixable desc, entity, entity_name)
            from public.org_hierarchy_drift()),
  'functions_present', (select jsonb_agg(proname order by proname) from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname in ('transfer_member','org_hierarchy_drift','org_hierarchy_repair',
                        'move_zone_to_region','move_region_to_district','lions_year_of',
                        'backfill_member_assignments')),
  'triggers_present', (select jsonb_agg(tgname order by tgname) from pg_trigger
      where not tgisinternal and tgname in ('members_district_from_club','members_assignment_history',
        'clubs_hierarchy_from_zone','clubs_cascade_members','zones_district_from_region',
        'zones_cascade_clubs','regions_cascade_zones')),
  'regions_all', (select jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name,
                    'district_id', district_id, 'deleted_at', deleted_at) order by code)
                  from public.regions),
  'zones_all', (select jsonb_agg(jsonb_build_object('id', id, 'code', code, 'name', name,
                  'region_id', region_id, 'deleted_at', deleted_at) order by code)
                from public.zones)
) as verify;
