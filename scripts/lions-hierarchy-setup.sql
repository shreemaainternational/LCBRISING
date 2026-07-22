-- =====================================================================
-- LCB Rising — Lions Hierarchy setup (consolidated, idempotent)
-- =====================================================================
-- Paste this whole file into the Supabase SQL editor for project
-- mvtqqlfzawyhntnsavbx and run it once. It is safe to re-run.
--
-- What it does (nothing destructive):
--   1. Creates the `constitutional_areas` table + links Multiple Districts
--      to it  (powers the top of the Region / Zone Management console).
--   2. Seeds Multiple District 323 and links District 3232 F1 under it.
--   3. Seeds 9 Regions × 2 Zones under District 3232 F1.
--   4. Corrects the Baroda Rising Star club number to 179323.
--
-- Prereqs already present from earlier migrations: the `regions`, `zones`,
-- `clubs`, `multiple_districts`, `districts`, `members` tables, the
-- `uuid_generate_v4()` and `tg_set_updated_at()` helpers, and the
-- `zones.region_id` / `clubs.zone_id` columns the console reparents on.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Constitutional Area (top level: CA → MD → District → Region → Zone
--    → Club → Member).
-- ---------------------------------------------------------------------
create table if not exists public.constitutional_areas (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.multiple_districts
  add column if not exists constitutional_area_id uuid
  references public.constitutional_areas(id) on delete set null;

create index if not exists idx_md_ca
  on public.multiple_districts(constitutional_area_id);

do $$ begin
  drop trigger if exists set_updated_ca on public.constitutional_areas;
  create trigger set_updated_ca before update on public.constitutional_areas
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.constitutional_areas enable row level security;

do $$ begin
  create policy ca_read_authenticated on public.constitutional_areas
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ca_admin_write on public.constitutional_areas
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    );
exception when duplicate_object then null; end $$;

-- Optional: seed the ISAAME constitutional area and link MD 323 to it.
-- (India sits under the ISAAME constitutional area in the Lions structure.)
insert into public.constitutional_areas (code, name)
values ('ISAAME', 'ISAAME — India, South Asia, Africa & the Middle East')
on conflict (code) do nothing;


-- ---------------------------------------------------------------------
-- 2. Multiple District 323 + link District 3232 F1 under it, and link
--    MD 323 under the constitutional area.
-- ---------------------------------------------------------------------
insert into public.multiple_districts (code, name, country)
values ('323', 'Multiple District 323', 'India')
on conflict (code) do nothing;

update public.multiple_districts md
   set constitutional_area_id = ca.id
  from public.constitutional_areas ca
 where ca.code = 'ISAAME'
   and md.code = '323'
   and md.constitutional_area_id is null;

update public.districts d
   set multiple_district_id = md.id
  from public.multiple_districts md
 where md.code = '323'
   and d.code = '3232 F1'
   and d.multiple_district_id is null;


-- ---------------------------------------------------------------------
-- 3. Seed 9 Regions, each with 2 Zones, under District 3232 F1
--    (falls back to the first district if that code isn't present).
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- 4. Correct the Baroda Rising Star LCI club number.
-- ---------------------------------------------------------------------
update public.clubs
   set club_number = '179323'
 where name = 'Lions Club of Baroda Rising Star'
   and deleted_at is null;


-- ---------------------------------------------------------------------
-- Quick sanity check (optional — returns counts after running).
-- ---------------------------------------------------------------------
select
  (select count(*) from public.constitutional_areas where deleted_at is null) as constitutional_areas,
  (select count(*) from public.multiple_districts   where deleted_at is null) as multiple_districts,
  (select count(*) from public.districts            where deleted_at is null) as districts,
  (select count(*) from public.regions              where deleted_at is null) as regions,
  (select count(*) from public.zones                where deleted_at is null) as zones,
  (select count(*) from public.clubs                where deleted_at is null) as clubs;
