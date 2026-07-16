-- =====================================================================
-- District Circular — bulk-upload table format + auto-generated assets
--
-- Extends the District Circulars surface with a structured "table" that
-- can hold every kind of district communication — plain circulars plus
-- events, programmes, cabinet meetings, DG visits, festivals,
-- felicitations, etc. — and supports:
--
--   1. Bulk upload from a spreadsheet (the canonical column layout).
--   2. Auto-segregation of an uploaded flyer / PDF / presentation / image
--      into these columns (via the AI extraction endpoint).
--   3. Per-entry auto-generated assets: a short message, WhatsApp text,
--      social-media caption + hashtags, flyer copy, presentation deck and
--      meeting minutes.
--   4. Club-wise / zone-wise / region-wise scoping and filtering.
-- =====================================================================

do $$ begin
  create type circular_entry_type as enum
    ('circular', 'event', 'programme', 'cabinet_meeting', 'dg_visit', 'festival', 'felicitation', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type circular_entry_status as enum ('draft', 'ready', 'published');
exception when duplicate_object then null; end $$;

-- Monotonic sequence so bulk inserts within the same second never collide
-- on reference_no (the plain-circular trigger derives its suffix from the
-- clock, which is fine for one-at-a-time inserts but not for bulk).
create sequence if not exists public.district_circular_entry_seq;

create table if not exists public.district_circular_entries (
  id uuid primary key default uuid_generate_v4(),
  district_id uuid not null references public.districts(id) on delete cascade,
  reference_no text unique,                         -- DCE-YYYYMM-XXXXX
  entry_type circular_entry_type not null default 'circular',
  title text not null,
  description text,
  category text,
  priority circular_priority not null default 'info',

  -- Scheduling (events / programmes / meetings / visits).
  event_date date,
  start_time text,
  end_time text,
  venue text,
  chief_guest text,

  -- Scoping. Null across all three = district-wide. The *_id columns power
  -- club-/zone-/region-wise filtering; the array columns allow a single
  -- entry to fan out to several zones or clubs.
  region_id uuid references public.regions(id) on delete set null,
  zone_id uuid references public.zones(id) on delete set null,
  club_id uuid references public.clubs(id) on delete set null,
  target_zone_ids uuid[] not null default '{}',
  target_club_ids uuid[] not null default '{}',

  -- Provenance of the row.
  source_kind text not null default 'manual',       -- manual | bulk | flyer | pdf | presentation | image
  source_url text,
  source_filename text,
  extracted boolean not null default false,
  extraction_confidence text,                       -- high | medium | low

  -- Auto-generated assets.
  short_message text,
  whatsapp_text text,
  social_caption text,
  social_hashtags text[] not null default '{}',
  flyer jsonb,                                       -- { headline, subheading, body, cta }
  presentation jsonb,                               -- { slides: [{ title, bullets[] }] }
  presentation_url text,
  minutes text,
  assets_generated_at timestamptz,

  status circular_entry_status not null default 'draft',
  -- Link to a dispatched circular once the entry is broadcast.
  circular_id uuid references public.district_circulars(id) on delete set null,

  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dce_district on public.district_circular_entries(district_id);
create index if not exists idx_dce_type on public.district_circular_entries(entry_type);
create index if not exists idx_dce_status on public.district_circular_entries(status);
create index if not exists idx_dce_region on public.district_circular_entries(region_id);
create index if not exists idx_dce_zone on public.district_circular_entries(zone_id);
create index if not exists idx_dce_club on public.district_circular_entries(club_id);
create index if not exists idx_dce_event_date on public.district_circular_entries(event_date desc);

-- Auto-numbering (sequence-backed → safe for bulk inserts).
create or replace function public.tg_circular_entry_ref() returns trigger
language plpgsql as $$
begin
  if new.reference_no is null then
    new.reference_no := 'DCE-' || to_char(now(), 'YYYYMM') || '-' ||
      lpad((nextval('public.district_circular_entry_seq') % 100000)::text, 5, '0');
  end if;
  return new;
end $$;

do $$ begin
  drop trigger if exists set_circular_entry_ref on public.district_circular_entries;
  create trigger set_circular_entry_ref before insert on public.district_circular_entries
    for each row execute function public.tg_circular_entry_ref();
  drop trigger if exists set_updated_circular_entry on public.district_circular_entries;
  create trigger set_updated_circular_entry before update on public.district_circular_entries
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.district_circular_entries enable row level security;

do $$ begin
  create policy dce_admin on public.district_circular_entries
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin', 'president', 'secretary', 'treasurer', 'officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

-- Clubs can read entries targeted at them (or their zone / region / the
-- whole district). Kept permissive-read to mirror district_circulars.
do $$ begin
  create policy dce_club_read on public.district_circular_entries for select using (true);
exception when duplicate_object then null; end $$;
