-- =====================================================================
-- 0062_service_activities.sql
-- Full-fidelity landing table for the Lions International
-- "Service Activities Information" portal export.
--
-- The CSV/Excel importer (entity = 'activities') writes one row here for
-- every reported service activity, preserving every column of the portal
-- export verbatim (People Served, Total Volunteers, Cause, Project Type,
-- Service Activity ID, sponsor hierarchy, …). Each row is then mapped down
-- to a public.activities row for the app's reporting model — the two are
-- linked through service_activities.activity_id.
--
-- Column mapping mirrors the Lion Portal export headers:
--   Sponsor MD                       -> sponsor_md
--   Sponsor District                 -> sponsor_district
--   Sponsor: Account Name            -> sponsor_account_name
--   Start Date / End Date            -> start_date / end_date
--   Report Complete                  -> report_complete
--   Status                           -> status
--   Title                            -> title
--   Description                      -> description
--   Activity Level                   -> activity_level
--   Cause                            -> cause
--   Project Type                     -> project_type
--   Signature Activity               -> signature_activity
--   Funded by an LCIF Grant          -> funded_by_lcif_grant
--   People Served (/ - Capped)       -> people_served / people_served_capped
--   Total Volunteers                 -> total_volunteers
--   Total Volunteer Hours (/-Capped) -> total_volunteer_hours / _capped
--   Total Funds Donated (/USD-Capped)-> total_funds_donated / _usd_capped
--   Donation to LCIF                 -> donation_to_lcif
--   Organization Benefited           -> organization_benefited
--   Total Funds Raised (/USD-Capped) -> total_funds_raised / _usd_capped
--   Trees Planted/Cared for          -> trees_planted
--   Created By: Full Name            -> created_by_full_name
--   Service Activity ID              -> service_activity_id (natural key)
--   Sponsor Zone / Region            -> sponsor_zone / sponsor_region
--   Sponsor: Account Id              -> sponsor_account_id
--   Sponsor: Parent Id               -> sponsor_parent_id
--   Sponsor: Parent Parent Id        -> sponsor_parent_parent_id
-- =====================================================================

create table if not exists public.service_activities (
  id uuid primary key default uuid_generate_v4(),

  -- Sponsor hierarchy (from the export)
  sponsor_md                text,
  sponsor_district          text,
  sponsor_account_name      text,
  sponsor_zone              text,
  sponsor_region            text,
  sponsor_account_id        text,
  sponsor_parent_id         text,
  sponsor_parent_parent_id  text,

  -- Core activity fields
  start_date                date,
  end_date                  date,
  report_complete           boolean not null default false,
  status                    text,
  title                     text not null,
  description               text,
  activity_level            text,
  cause                     text,
  project_type              text,
  signature_activity        boolean not null default false,
  funded_by_lcif_grant      boolean not null default false,

  -- Impact metrics
  people_served                    integer not null default 0,
  people_served_capped             integer not null default 0,
  total_volunteers                 integer not null default 0,
  total_volunteer_hours            numeric(12,2) not null default 0,
  total_volunteer_hours_capped     numeric(12,2) not null default 0,
  total_funds_donated              numeric(14,2) not null default 0,
  total_funds_donated_usd_capped   numeric(14,2) not null default 0,
  donation_to_lcif                 boolean not null default false,
  organization_benefited           text,
  total_funds_raised               numeric(14,2) not null default 0,
  total_funds_raised_usd_capped    numeric(14,2) not null default 0,
  trees_planted                    numeric(12,2) not null default 0,

  created_by_full_name      text,

  -- Natural key from the Lion Portal ("SA-06621893"). Unique when present.
  service_activity_id       text,

  -- App-side links
  club_id                   uuid references public.clubs(id) on delete set null,
  activity_id               uuid references public.activities(id) on delete set null,
  category                  text,           -- mapped app service category

  -- Import provenance
  source_file               text,
  imported_at               timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Natural key: one row per Lion Portal Service Activity ID.
create unique index if not exists service_activities_activity_id_key
  on public.service_activities (service_activity_id)
  where service_activity_id is not null and service_activity_id <> '';

-- Fallback dedupe key for rows without a portal ID.
create unique index if not exists service_activities_title_date_key
  on public.service_activities (club_id, title, end_date)
  where service_activity_id is null or service_activity_id = '';

create index if not exists service_activities_end_date_idx
  on public.service_activities (end_date);
create index if not exists service_activities_cause_idx
  on public.service_activities (cause);
create index if not exists service_activities_activity_fk_idx
  on public.service_activities (activity_id);

-- updated_at trigger (matches the app-wide convention in 0001).
drop trigger if exists trg_service_activities_updated on public.service_activities;
create trigger trg_service_activities_updated
  before update on public.service_activities
  for each row execute function public.set_updated_at();

-- Row Level Security — public read (service activities are shown on the
-- public site), admin write. Mirrors public.activities.
alter table public.service_activities enable row level security;

drop policy if exists "service_activities_public_read" on public.service_activities;
create policy "service_activities_public_read"
  on public.service_activities for select using (true);

drop policy if exists "service_activities_admin_all" on public.service_activities;
create policy "service_activities_admin_all"
  on public.service_activities for all
  using (public.is_admin()) with check (public.is_admin());
