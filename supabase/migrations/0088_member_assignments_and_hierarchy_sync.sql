-- =====================================================================
-- 0088 — Member club-assignment history + automatic hierarchy sync
--
-- The organisational chain is District → Region → Zone → Club → Member.
-- Each link is already stored once (zones.region_id, clubs.zone_id,
-- members.club_id), but older migrations also copy parent ids down the
-- chain (zones.district_id, clubs.region_id, clubs.district_id,
-- members.district_id). Nothing kept those copies in step: moving a zone
-- to another region, or a region to another district, left every club
-- and member below it pointing at the old parent.
--
-- This migration:
--   1. lions_year_of(date)            — Lionistic Year label (Jul–Jun).
--   2. club_hierarchy (view)          — each club's current zone, region
--                                       and district, derived from the
--                                       chain (the copies are fallbacks).
--   3. member_club_assignments        — one row per period a member
--                                       belonged to a club; the open row
--                                       (effective_to is null) is the
--                                       current one, at most one per
--                                       member. Backfilled from members.
--   4. Triggers that keep the copies in step on every write path
--      (API, admin UI, bulk import, SQL):
--        members  club_id change    → district_id from the club; close the
--                                     open assignment, open a new one
--        clubs    zone_id change    → region_id / district_id from zone
--        clubs    district change   → members.district_id
--        zones    region change     → district_id from region; cascade to
--                                     the zone's clubs (+ history rows)
--        regions  district change   → cascade to the region's zones
--      A parent is only ever copied down when it is set — a missing
--      zone→region link never blanks a club's own region.
--   5. transfer_member()              — validated, idempotent transfer in
--                                       one transaction (service role only).
--   6. org_hierarchy_drift() / org_hierarchy_repair() — preview and apply
--      the same derivation to data written before this migration.
--
-- Additive and idempotent: no column is dropped, no member or club row is
-- created or deleted. Existing ids, foreign keys and activity links are
-- untouched.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lionistic Year label for a date: 1 Jul 2026 – 30 Jun 2027 → '2026-27'
-- ---------------------------------------------------------------------
create or replace function public.lions_year_of(d date)
returns text
language sql
immutable
as $$
  select y::text || '-' || lpad(((y + 1) % 100)::text, 2, '0')
  from (select case when extract(month from d) >= 7
                    then extract(year from d)::int
                    else extract(year from d)::int - 1 end as y) s
$$;

-- ---------------------------------------------------------------------
-- 2. Current zone / region / district of every club, from the chain.
--    security_invoker: callers see only what their own RLS allows.
-- ---------------------------------------------------------------------
create or replace view public.club_hierarchy
with (security_invoker = true) as
select
  c.id                                               as club_id,
  c.name                                             as club_name,
  c.club_number,
  c.deleted_at,
  z.id                                               as zone_id,
  z.name                                             as zone_name,
  r.id                                               as region_id,
  r.name                                             as region_name,
  d.id                                               as district_id,
  d.code                                             as district_code,
  d.name                                             as district_name
from public.clubs c
left join public.zones z
  on z.id = c.zone_id and z.deleted_at is null
left join public.regions r
  on r.id = coalesce(z.region_id, c.region_id) and r.deleted_at is null
left join public.districts d
  on d.id = coalesce(r.district_id, z.district_id, c.district_id);

-- ---------------------------------------------------------------------
-- 3. Assignment history
-- ---------------------------------------------------------------------
create table if not exists public.member_club_assignments (
  id             uuid primary key default uuid_generate_v4(),
  member_id      uuid not null references public.members(id) on delete cascade,
  club_id        uuid references public.clubs(id) on delete set null,
  -- Snapshot of the club's place in the hierarchy when the period began,
  -- so past years still read correctly after later reorganisations.
  zone_id        uuid references public.zones(id) on delete set null,
  region_id      uuid references public.regions(id) on delete set null,
  district_id    uuid references public.districts(id) on delete set null,
  lions_year     text not null,
  effective_from date not null,
  effective_to   date,
  source         text not null default 'edit'
                 check (source in ('backfill','transfer','edit','bulk','correction','import')),
  reason         text,
  performed_by   uuid references public.members(id) on delete set null,
  request_id     text,
  created_at     timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create unique index if not exists mca_one_current_per_member
  on public.member_club_assignments (member_id) where effective_to is null;
create index if not exists mca_current_by_club
  on public.member_club_assignments (club_id) where effective_to is null;
create index if not exists mca_member_timeline
  on public.member_club_assignments (member_id, effective_from desc);
create unique index if not exists mca_request_id
  on public.member_club_assignments (request_id) where request_id is not null;

alter table public.member_club_assignments enable row level security;

do $$ begin
  create policy mca_admin_read on public.member_club_assignments
    for select using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy mca_self_read on public.member_club_assignments
    for select using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.id = member_club_assignments.member_id)
    );
exception when duplicate_object then null; end $$;

-- Opens a current assignment for every member who has a club but none.
create or replace function public.backfill_member_assignments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  insert into public.member_club_assignments
    (member_id, club_id, zone_id, region_id, district_id,
     lions_year, effective_from, source, reason)
  select m.id, m.club_id, h.zone_id, h.region_id, h.district_id,
         public.lions_year_of(f.d), f.d, 'backfill',
         'Recorded from the existing club assignment'
  from public.members m
  join public.club_hierarchy h on h.club_id = m.club_id
  cross join lateral (select least(coalesce(m.joined_at, m.created_at::date), current_date) as d) f
  where m.club_id is not null
    and not exists (select 1 from public.member_club_assignments a
                    where a.member_id = m.id and a.effective_to is null);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- 4. Hierarchy triggers
-- ---------------------------------------------------------------------

-- members: district follows the club (a member of a club is in that
-- club's district). Members without a club keep their own district.
create or replace function public.tg_members_district_from_club()
returns trigger
language plpgsql
as $$
declare v_district uuid;
begin
  if new.club_id is not null then
    select district_id into v_district from public.club_hierarchy where club_id = new.club_id;
    if v_district is not null then
      new.district_id := v_district;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists members_district_from_club on public.members;
create trigger members_district_from_club
  before insert or update of club_id, district_id on public.members
  for each row execute function public.tg_members_district_from_club();

-- members: every club change closes the open assignment and opens a new
-- one. Callers that know more (transfer_member) pass the effective date,
-- source, reason, actor and request id through transaction-local
-- settings; plain edits fall back to today / 'edit'.
create or replace function public.tg_members_assignment_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eff    date := coalesce(nullif(current_setting('lcb.effective_date', true), '')::date, current_date);
  v_source text := coalesce(nullif(current_setting('lcb.assignment_source', true), ''), 'edit');
  v_reason text := nullif(current_setting('lcb.assignment_reason', true), '');
  v_actor  uuid := nullif(current_setting('lcb.actor_member_id', true), '')::uuid;
  v_req    text := nullif(current_setting('lcb.request_id', true), '');
  v_from   date;
  h        record;
begin
  if tg_op = 'UPDATE' and new.club_id is not distinct from old.club_id then
    return null;
  end if;

  select effective_from into v_from
  from public.member_club_assignments
  where member_id = new.id and effective_to is null;

  if v_from is not null then
    v_eff := greatest(v_eff, v_from);
    update public.member_club_assignments
       set effective_to = v_eff
     where member_id = new.id and effective_to is null;
  end if;

  if new.club_id is not null then
    select zone_id, region_id, district_id into h
    from public.club_hierarchy where club_id = new.club_id;
    insert into public.member_club_assignments
      (member_id, club_id, zone_id, region_id, district_id, lions_year,
       effective_from, source, reason, performed_by, request_id)
    values
      (new.id, new.club_id, h.zone_id, h.region_id, h.district_id,
       public.lions_year_of(v_eff), v_eff,
       case when tg_op = 'INSERT' and v_source = 'edit' then 'import' else v_source end,
       v_reason, v_actor, v_req);
  end if;
  return null;
end $$;

drop trigger if exists members_assignment_history on public.members;
create trigger members_assignment_history
  after insert or update of club_id on public.members
  for each row execute function public.tg_members_assignment_history();

-- clubs: region / district follow the zone whenever the zone carries them.
create or replace function public.tg_clubs_hierarchy_from_zone()
returns trigger
language plpgsql
as $$
declare v_region uuid; v_district uuid;
begin
  if new.zone_id is not null then
    select z.region_id, coalesce(r.district_id, z.district_id)
      into v_region, v_district
    from public.zones z
    left join public.regions r on r.id = z.region_id
    where z.id = new.zone_id;
    if v_region is not null then new.region_id := v_region; end if;
    if v_district is not null then new.district_id := v_district; end if;
  elsif new.region_id is not null then
    select district_id into v_district from public.regions where id = new.region_id;
    if v_district is not null then new.district_id := v_district; end if;
  end if;
  return new;
end $$;

drop trigger if exists clubs_hierarchy_from_zone on public.clubs;
create trigger clubs_hierarchy_from_zone
  before insert or update of zone_id, region_id, district_id on public.clubs
  for each row execute function public.tg_clubs_hierarchy_from_zone();

-- clubs: a district change moves the club's members' district with it.
create or replace function public.tg_clubs_cascade_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.district_id is distinct from old.district_id and new.district_id is not null then
    update public.members
       set district_id = new.district_id
     where club_id = new.id
       and district_id is distinct from new.district_id;
  end if;
  return null;
end $$;

drop trigger if exists clubs_cascade_members on public.clubs;
-- Fires on any update: a BEFORE trigger can change district_id without the
-- column being in the UPDATE's SET list (e.g. a zone-only edit).
create trigger clubs_cascade_members
  after update on public.clubs
  for each row execute function public.tg_clubs_cascade_members();

-- zones: district follows the region.
create or replace function public.tg_zones_district_from_region()
returns trigger
language plpgsql
as $$
declare v_district uuid;
begin
  if new.region_id is not null then
    select district_id into v_district from public.regions where id = new.region_id;
    if v_district is not null then new.district_id := v_district; end if;
  end if;
  return new;
end $$;

drop trigger if exists zones_district_from_region on public.zones;
create trigger zones_district_from_region
  before insert or update of region_id, district_id on public.zones
  for each row execute function public.tg_zones_district_from_region();

-- zones: a region / district change moves the zone's live clubs with it,
-- recording each move in club_assignment_history.
create or replace function public.tg_zones_cascade_clubs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := coalesce(nullif(current_setting('lcb.assignment_reason', true), ''),
                            'Zone moved to another region or district');
  v_actor  uuid := nullif(current_setting('lcb.actor_member_id', true), '')::uuid;
begin
  if new.region_id is not distinct from old.region_id
     and new.district_id is not distinct from old.district_id then
    return null;
  end if;

  insert into public.club_assignment_history
    (club_id, action, from_zone_id, to_zone_id, from_region_id, to_region_id,
     from_district_id, to_district_id, changed_field, reason, performed_by)
  select c.id, 'reassigned', c.zone_id, c.zone_id,
         c.region_id, coalesce(new.region_id, c.region_id),
         c.district_id, new.district_id,
         'zone_hierarchy', v_reason, v_actor
  from public.clubs c
  where c.zone_id = new.id
    and c.deleted_at is null
    and (c.region_id is distinct from coalesce(new.region_id, c.region_id)
         or c.district_id is distinct from new.district_id);

  update public.clubs c
     set region_id   = coalesce(new.region_id, c.region_id),
         district_id = new.district_id
   where c.zone_id = new.id
     and c.deleted_at is null
     and (c.region_id is distinct from coalesce(new.region_id, c.region_id)
          or c.district_id is distinct from new.district_id);
  return null;
end $$;

drop trigger if exists zones_cascade_clubs on public.zones;
create trigger zones_cascade_clubs
  after update of region_id, district_id on public.zones
  for each row execute function public.tg_zones_cascade_clubs();

-- regions: a district change moves the region's zones (and, through the
-- zone trigger, their clubs and members).
create or replace function public.tg_regions_cascade_zones()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.district_id is distinct from old.district_id then
    update public.zones
       set district_id = new.district_id
     where region_id = new.id
       and district_id is distinct from new.district_id;
  end if;
  return null;
end $$;

drop trigger if exists regions_cascade_zones on public.regions;
create trigger regions_cascade_zones
  after update of district_id on public.regions
  for each row execute function public.tg_regions_cascade_zones();

-- ---------------------------------------------------------------------
-- 5. Transfer a member to another club in one transaction.
--    Idempotent: the same request id, or a transfer to the member's
--    current club, changes nothing.
-- ---------------------------------------------------------------------
create or replace function public.transfer_member(
  p_member_id       uuid,
  p_to_club_id      uuid,
  p_effective_on    date default null,
  p_reason          text default null,
  p_actor_member_id uuid default null,
  p_source          text default 'transfer',
  p_request_id      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eff     date := coalesce(p_effective_on, current_date);
  v_member  record;
  v_target  record;
  v_from    date;
begin
  if p_source not in ('transfer','bulk','correction') then
    raise exception 'invalid_source' using errcode = '22023';
  end if;

  if p_request_id is not null and exists (
       select 1 from public.member_club_assignments where request_id = p_request_id) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  select id, club_id, deleted_at into v_member
  from public.members where id = p_member_id for update;
  if not found then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if v_member.deleted_at is not null then
    raise exception 'member_deleted' using errcode = '22023';
  end if;

  select * into v_target from public.club_hierarchy where club_id = p_to_club_id;
  if not found or v_target.deleted_at is not null then
    raise exception 'target_club_invalid' using errcode = '22023';
  end if;

  if v_member.club_id is not distinct from p_to_club_id then
    return jsonb_build_object('status', 'unchanged');
  end if;

  select effective_from into v_from
  from public.member_club_assignments
  where member_id = p_member_id and effective_to is null;
  if v_from is not null and v_eff < v_from then
    raise exception 'effective_date_before_current_assignment' using errcode = '22023';
  end if;

  perform set_config('lcb.effective_date',    v_eff::text, true);
  perform set_config('lcb.assignment_source', p_source, true);
  perform set_config('lcb.assignment_reason', coalesce(p_reason, ''), true);
  perform set_config('lcb.actor_member_id',   coalesce(p_actor_member_id::text, ''), true);
  perform set_config('lcb.request_id',        coalesce(p_request_id, ''), true);

  update public.members set club_id = p_to_club_id where id = p_member_id;

  return jsonb_build_object(
    'status',         'transferred',
    'from_club_id',   v_member.club_id,
    'to_club_id',     p_to_club_id,
    'zone_id',        v_target.zone_id,
    'region_id',      v_target.region_id,
    'district_id',    v_target.district_id,
    'effective_from', v_eff,
    'lions_year',     public.lions_year_of(v_eff));
end $$;

-- ---------------------------------------------------------------------
-- 6. Drift preview / repair for data written before these triggers.
--    fixable = false rows are gaps a person must resolve (e.g. a zone
--    with no region); they are reported, never guessed.
-- ---------------------------------------------------------------------
create or replace function public.org_hierarchy_drift()
returns table (
  entity        text,
  entity_id     uuid,
  entity_name   text,
  field         text,
  current_value uuid,
  derived_value uuid,
  fixable       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  -- zone district ≠ its region's district
  select 'zone', z.id, z.name, 'district_id', z.district_id, r.district_id, true
  from public.zones z join public.regions r on r.id = z.region_id
  where z.deleted_at is null and z.district_id is distinct from r.district_id
  union all
  -- club region ≠ its zone's region
  select 'club', c.id, c.name, 'region_id', c.region_id, z.region_id, true
  from public.clubs c join public.zones z on z.id = c.zone_id
  where c.deleted_at is null and z.region_id is not null
    and c.region_id is distinct from z.region_id
  union all
  -- club district ≠ its zone's (or zone's region's) district
  select 'club', c.id, c.name, 'district_id', c.district_id,
         coalesce(r.district_id, z.district_id), true
  from public.clubs c join public.zones z on z.id = c.zone_id
  left join public.regions r on r.id = z.region_id
  where c.deleted_at is null
    and c.district_id is distinct from coalesce(r.district_id, z.district_id)
  union all
  -- member district ≠ their club's district
  select 'member', m.id, m.name, 'district_id', m.district_id, h.district_id, true
  from public.members m join public.club_hierarchy h on h.club_id = m.club_id
  where m.deleted_at is null and h.district_id is not null
    and m.district_id is distinct from h.district_id
  union all
  -- member with a club but no current assignment record
  select 'member', m.id, m.name, 'assignment_history', null, m.club_id, true
  from public.members m
  where m.deleted_at is null and m.club_id is not null
    and not exists (select 1 from public.member_club_assignments a
                    where a.member_id = m.id and a.effective_to is null)
  union all
  -- current assignment pointing at a different club than the member row
  select 'member', m.id, m.name, 'assignment_club', a.club_id, m.club_id, false
  from public.members m
  join public.member_club_assignments a on a.member_id = m.id and a.effective_to is null
  where m.deleted_at is null and a.club_id is distinct from m.club_id
  union all
  -- gaps a person must resolve
  select 'zone', z.id, z.name, 'missing_region', null, null, false
  from public.zones z where z.deleted_at is null and z.region_id is null
  union all
  select 'club', c.id, c.name, 'missing_zone', null, null, false
  from public.clubs c where c.deleted_at is null and c.zone_id is null
  union all
  select 'member', m.id, m.name, 'missing_club', null, null, false
  from public.members m where m.deleted_at is null and m.club_id is null
$$;

create or replace function public.org_hierarchy_repair(
  p_actor_member_id uuid default null,
  p_reason          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_zones int; n_clubs int; n_members int; n_history int;
begin
  perform set_config('lcb.assignment_reason',
                     coalesce(p_reason, 'Hierarchy sync: derived from the approved structure'), true);
  perform set_config('lcb.actor_member_id', coalesce(p_actor_member_id::text, ''), true);

  -- Zones first: their trigger cascades to clubs and members.
  update public.zones z
     set district_id = r.district_id
    from public.regions r
   where r.id = z.region_id and z.deleted_at is null
     and z.district_id is distinct from r.district_id;
  get diagnostics n_zones = row_count;

  -- Clubs whose own copies still differ from their zone.
  insert into public.club_assignment_history
    (club_id, action, from_zone_id, to_zone_id, from_region_id, to_region_id,
     from_district_id, to_district_id, changed_field, reason, performed_by)
  select c.id, 'reassigned', c.zone_id, c.zone_id,
         c.region_id, coalesce(z.region_id, c.region_id),
         c.district_id, coalesce(r.district_id, z.district_id),
         'hierarchy_sync', current_setting('lcb.assignment_reason', true), p_actor_member_id
  from public.clubs c join public.zones z on z.id = c.zone_id
  left join public.regions r on r.id = z.region_id
  where c.deleted_at is null
    and (c.region_id is distinct from coalesce(z.region_id, c.region_id)
         or c.district_id is distinct from coalesce(r.district_id, z.district_id));

  update public.clubs c
     set zone_id = c.zone_id            -- re-runs tg_clubs_hierarchy_from_zone
   where c.deleted_at is null and c.zone_id is not null
     and exists (select 1 from public.zones z
                 left join public.regions r on r.id = z.region_id
                 where z.id = c.zone_id
                   and (c.region_id is distinct from coalesce(z.region_id, c.region_id)
                        or c.district_id is distinct from coalesce(r.district_id, z.district_id)));
  get diagnostics n_clubs = row_count;

  update public.members m
     set district_id = h.district_id
    from public.club_hierarchy h
   where h.club_id = m.club_id and m.deleted_at is null
     and h.district_id is not null
     and m.district_id is distinct from h.district_id;
  get diagnostics n_members = row_count;

  n_history := public.backfill_member_assignments();

  return jsonb_build_object(
    'zones_updated',          n_zones,
    'clubs_updated',          n_clubs,
    'members_updated',        n_members,
    'assignments_backfilled', n_history);
end $$;

-- Server-side only: the API routes call these with the service role
-- after their own permission checks.
revoke all on function public.transfer_member(uuid, uuid, date, text, uuid, text, text) from public;
revoke all on function public.org_hierarchy_drift() from public;
revoke all on function public.org_hierarchy_repair(uuid, text) from public;
revoke all on function public.backfill_member_assignments() from public;
do $$ begin
  grant execute on function public.transfer_member(uuid, uuid, date, text, uuid, text, text) to service_role;
  grant execute on function public.org_hierarchy_drift() to service_role;
  grant execute on function public.org_hierarchy_repair(uuid, text) to service_role;
  grant execute on function public.backfill_member_assignments() to service_role;
exception when undefined_object then null; end $$;

-- ---------------------------------------------------------------------
-- 7. Record the current assignment of every existing member.
-- ---------------------------------------------------------------------
select public.backfill_member_assignments();
