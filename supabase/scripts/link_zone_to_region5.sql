-- =====================================================================
-- link_zone_to_region5.sql  (one-off, owner-approved 22 Oct 2026)
-- Zone "Region 5 Zone 1" (code R5, the only live zone, 5 clubs) belongs
-- to Region 5. That region exists but was soft-deleted on 22 Jul 2026, so
-- it is restored (same id — no duplicate region is created) and the zone
-- is linked to it with move_zone_to_region(), which cascades the region
-- to the zone's clubs and records club_assignment_history rows.
-- Then org_hierarchy_repair() fills members' empty district from their
-- club (the "fixable" rows from verify_hierarchy_sync.sql).
-- Guarded: does nothing if the ids/names no longer match. Idempotent.
-- =====================================================================
do $lcblink$
declare
  v_region uuid := '401b3cb6-9db5-44f9-a626-ec7d6f0cede7';
  v_zone   uuid := 'd32e8938-afff-4850-a4cf-c79130cd013f';
  v_reason text := 'Zone Region 5 Zone 1 belongs to Region 5 (confirmed by club admin, 22 Oct 2026)';
  v_move   jsonb;
begin
  if not exists (select 1 from public.regions where id = v_region and name = 'Region 5')
     or not exists (select 1 from public.zones where id = v_zone and name = 'Region 5 Zone 1' and deleted_at is null) then
    raise notice 'skip: region or zone no longer matches';
    return;
  end if;

  if exists (select 1 from public.regions where id = v_region and deleted_at is not null) then
    update public.regions set deleted_at = null where id = v_region;
    insert into public.audit_logs (actor_label, action, entity, entity_id, payload)
    values ('system', 'region.restore', 'region', v_region,
            jsonb_build_object('reason', v_reason, 'previously_deleted', true));
  end if;

  v_move := public.move_zone_to_region(v_zone, v_region, v_reason, null);
  if v_move ->> 'status' = 'moved' then
    insert into public.audit_logs (actor_label, action, entity, entity_id, payload)
    values ('system', 'zone.move_region', 'zone', v_zone,
            jsonb_build_object('to_region_id', v_region, 'reason', v_reason, 'result', v_move));
  end if;
  perform public.org_hierarchy_repair(null, 'Hierarchy sync: fill member district from club (0088 rollout)');
end
$lcblink$;

select jsonb_build_object(
  'region_5', (select jsonb_build_object('deleted_at', deleted_at, 'district_id', district_id)
               from public.regions where id = '401b3cb6-9db5-44f9-a626-ec7d6f0cede7'),
  'zone', (select jsonb_build_object('region_id', region_id, 'district_id', district_id)
           from public.zones where id = 'd32e8938-afff-4850-a4cf-c79130cd013f'),
  'club_placements', (select jsonb_agg(jsonb_build_object('club', club_name, 'zone', zone_name,
                        'region', region_name, 'district', district_code) order by club_name)
                      from public.club_hierarchy where deleted_at is null),
  'history_rows_added', (select count(*) from public.club_assignment_history
                         where changed_field = 'zone_hierarchy' and performed_at > now() - interval '10 minutes'),
  'remaining_drift', (select jsonb_agg(jsonb_build_object('entity', entity, 'name', entity_name, 'field', field))
                      from public.org_hierarchy_drift())
) as result;
