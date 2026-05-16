-- =====================================================================
-- Zone Chairperson dashboard support
--   * Link a zone to its chairperson Lion (members.id) so we can scope
--     the /zone portal to the logged-in chairperson's zone.
--   * Advisories — messages a zone chair sends to a club about
--     attendance, compliance, etc. Surfaces in the Alerts & Actions
--     panel and goes out via notifications.
-- =====================================================================

alter table public.zones
  add column if not exists chairperson_member_id uuid references public.members(id) on delete set null;

create index if not exists idx_zones_chairperson on public.zones(chairperson_member_id);

-- Same for regions, so a Region Chair can also use a similar portal.
alter table public.regions
  add column if not exists chairperson_member_id uuid references public.members(id) on delete set null;

create index if not exists idx_regions_chairperson on public.regions(chairperson_member_id);

-- ---------------------------------------------------------------------
-- Advisories: chair → club messages with priority + status
-- ---------------------------------------------------------------------
do $$ begin
  create type advisory_priority as enum ('info', 'warning', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type advisory_status as enum ('open', 'acknowledged', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.advisories (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid references public.zones(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,
  club_id uuid references public.clubs(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  sent_by uuid references public.members(id) on delete set null,
  subject text not null,
  body text not null,
  priority advisory_priority not null default 'info',
  status advisory_status not null default 'open',
  category text,
  action_required text,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_advisories_zone on public.advisories(zone_id);
create index if not exists idx_advisories_club on public.advisories(club_id);
create index if not exists idx_advisories_status on public.advisories(status);
create index if not exists idx_advisories_created on public.advisories(created_at desc);

do $$ begin
  drop trigger if exists set_updated_advisories on public.advisories;
  create trigger set_updated_advisories before update on public.advisories
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.advisories enable row level security;

do $$ begin
  create policy advisories_admin_all on public.advisories
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

-- Zone chair sees their own zone's advisories (read + write)
do $$ begin
  create policy advisories_zone_chair on public.advisories
    for all using (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
    ) with check (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
