-- =====================================================================
-- Lions Year tenure calendar
-- Tracks every official Lions / district / multi-district / zone /
-- club event for the 12-month tenure, with categories, hosts, RSVP
-- counts and links back to /admin/events.
-- =====================================================================

do $$ begin
  create type lions_event_category as enum (
    'service_week',          -- LCI service week (e.g. Vision Week, Diabetes Awareness Week)
    'dg_visit',              -- District Governor official visit
    'cabinet_meeting',       -- District cabinet
    'zone_meeting',          -- Zone-level meeting
    'club_meeting',          -- Regular club meeting
    'installation',          -- Office installation
    'charter_anniversary',   -- Club / district charter night
    'mega_project',          -- Flagship service project
    'regional_conference',
    'multiple_district_conference',
    'lions_international_convention',
    'training',              -- LCI Learning Center / Leadership Institute
    'membership_drive',
    'fundraiser',
    'social',                -- Zone / club social
    'awards_night',
    'leo_event',
    'special_day',           -- Founder's Day, Helen Keller Day etc.
    'holiday',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lions_event_scope as enum (
    'international', 'multiple_district', 'district', 'region', 'zone', 'club'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.lions_calendar (
  id uuid primary key default uuid_generate_v4(),
  lions_year text not null,                -- e.g. "2025-26"
  title text not null,
  category lions_event_category not null default 'other',
  scope lions_event_scope not null default 'zone',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  description text,
  host_member_id uuid references public.members(id) on delete set null,
  host_name text,                          -- in case host isn't a member yet
  club_id uuid references public.clubs(id) on delete set null,
  zone_id uuid references public.zones(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,
  multiple_district_id uuid references public.multiple_districts(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,  -- if also published as a CRM event
  announced_by text,                       -- e.g. "DG MJF Lion XYZ"
  source_url text,
  rsvp_required boolean not null default false,
  cover_url text,
  color text,                              -- override color for calendar UI
  tags text[] not null default '{}',
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_lions_cal_year on public.lions_calendar(lions_year);
create index if not exists idx_lions_cal_start on public.lions_calendar(starts_at);
create index if not exists idx_lions_cal_scope on public.lions_calendar(scope);
create index if not exists idx_lions_cal_category on public.lions_calendar(category);
create index if not exists idx_lions_cal_zone on public.lions_calendar(zone_id);

do $$ begin
  drop trigger if exists set_updated_lions_cal on public.lions_calendar;
  create trigger set_updated_lions_cal before update on public.lions_calendar
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.lions_calendar enable row level security;

do $$ begin
  -- Anyone authenticated can read; only admins/officers/chair can write
  create policy lions_cal_read on public.lions_calendar
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy lions_cal_admin_write on public.lions_calendar
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy lions_cal_chair_write on public.lions_calendar
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

-- ---------------------------------------------------------------------
-- Seed special-day rows for the current Lions year so the calendar is
-- never empty out of the box. Idempotent.
-- ---------------------------------------------------------------------
do $$
declare
  current_year text := case
    when extract(month from current_date) >= 7
      then to_char(current_date, 'YYYY') || '-' || to_char(current_date + interval '1 year', 'YY')
      else to_char(current_date - interval '1 year', 'YYYY') || '-' || to_char(current_date, 'YY')
  end;
  y_start int := case when extract(month from current_date) >= 7 then extract(year from current_date) else extract(year from current_date) - 1 end;
begin
  insert into public.lions_calendar (lions_year, title, category, scope, starts_at, all_day, description)
  values
    (current_year, 'Lions Year begins',                          'special_day', 'international', make_timestamptz(y_start,     7,  1, 0, 0, 0), true, 'Start of the Lions International tenure year.'),
    (current_year, 'Membership Growth Month',                    'special_day', 'international', make_timestamptz(y_start,     9,  1, 0, 0, 0), true, 'Worldwide focus on new member induction.'),
    (current_year, 'World Sight Day · Vision Week',              'service_week','international', make_timestamptz(y_start,    10,  9, 0, 0, 0), true, 'Vision is a Lions Global Cause — service projects worldwide.'),
    (current_year, 'World Diabetes Day · Diabetes Week',         'service_week','international', make_timestamptz(y_start,    11, 14, 0, 0, 0), true, 'Diabetes is a Lions Global Cause.'),
    (current_year, 'World AIDS Day',                             'special_day', 'international', make_timestamptz(y_start,    12,  1, 0, 0, 0), true, ''),
    (current_year, 'International Childhood Cancer Day · Service Week', 'service_week','international', make_timestamptz(y_start+1, 2, 15, 0, 0, 0), true, 'Childhood Cancer is a Lions Global Cause.'),
    (current_year, 'Founder''s Day (Melvin Jones)',              'special_day', 'international', make_timestamptz(y_start+1,   1, 13, 0, 0, 0), true, 'Birthday of Melvin Jones, founder of Lions Clubs International (1879).'),
    (current_year, 'Helen Keller Day · Lions Worldwide Service Week', 'service_week','international', make_timestamptz(y_start+1, 6, 27, 0, 0, 0), true, 'Anniversary of Helen Keller''s 1925 challenge to Lions.'),
    (current_year, 'World Environment Day · Environment Week',   'service_week','international', make_timestamptz(y_start+1,   6,  5, 0, 0, 0), true, ''),
    (current_year, 'International Day for Older Persons',        'special_day', 'international', make_timestamptz(y_start,    10,  1, 0, 0, 0), true, ''),
    (current_year, 'Republic Day · Service Project',             'special_day', 'multiple_district', make_timestamptz(y_start+1, 1, 26, 0, 0, 0), true, 'Multiple District 323 community projects.'),
    (current_year, 'Independence Day · Service Project',         'special_day', 'multiple_district', make_timestamptz(y_start,    8, 15, 0, 0, 0), true, ''),
    (current_year, 'Lions Year ends',                            'special_day', 'international', make_timestamptz(y_start+1,   6, 30, 0, 0, 0), true, '')
  on conflict do nothing;
end $$;
