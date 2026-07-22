-- =====================================================================
-- Seed the district hierarchy: 9 regions, each with 2 zones.
--
--   Region 1 → "Region 1 Zone 1", "Region 1 Zone 2"
--   Region 2 → "Region 2 Zone 1", "Region 2 Zone 2"
--   … through Region 9 (contiguous, no gaps).
--
-- Attached to the default district (3232 F1, or the first district when
-- that code isn't present). Idempotent — re-running updates names and the
-- region link without creating duplicates. Zones carry region_id so the
-- Regions / Zones / Hierarchy tabs show the association.
-- =====================================================================

do $$
declare
  did uuid;
  rid uuid;
  r   int;
  z   int;
begin
  select id into did from public.districts
   where code = '3232 F1' and deleted_at is null limit 1;
  if did is null then
    select id into did from public.districts
     where deleted_at is null order by code limit 1;
  end if;
  if did is null then
    raise notice 'No district found — skipping region/zone seed.';
    return;
  end if;

  for r in 1..9 loop
    insert into public.regions (district_id, code, name)
    values (did, 'R' || r, 'Region ' || r)
    on conflict (district_id, code) do update set name = excluded.name
    returning id into rid;

    for z in 1..2 loop
      insert into public.zones (district_id, region_id, code, name)
      values (did, rid, 'R' || r || 'Z' || z, 'Region ' || r || ' Zone ' || z)
      on conflict (district_id, code) do update
        set name = excluded.name, region_id = excluded.region_id;
    end loop;
  end loop;
end $$;
