-- =====================================================================
-- Enterprise CRM Integration Platform — schema extension
-- Adds:
--   * Lions federation hierarchy (multi-districts, districts, regions,
--     zones, expanded clubs)
--   * Officer history with term tracking
--   * OAuth/OIDC account & session tables (SSO via configurable IdP)
--   * Audit log & sync log
--   * Integration registry
--   * Attendance, committees, trainings, awards
-- Idempotent: safe to re-run.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Federation-wide role enum (additive to legacy member_role)
-- ---------------------------------------------------------------------
do $$ begin
  create type lions_role as enum (
    'international_admin',
    'multiple_district_admin',
    'district_governor',
    'vice_district_governor',
    'cabinet_officer',
    'region_chairperson',
    'zone_chairperson',
    'club_president',
    'club_secretary',
    'club_treasurer',
    'club_officer',
    'member',
    'guest_viewer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type officer_term_status as enum ('active', 'past', 'pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sync_status as enum ('queued', 'running', 'success', 'partial', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sync_source as enum ('lions_oidc', 'rest_api', 'csv', 'excel', 'webhook', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('present', 'absent', 'excused', 'remote');
exception when duplicate_object then null; end $$;

do $$ begin
  create type integration_kind as enum (
    'oidc', 'rest', 'csv', 'excel', 'webhook',
    'whatsapp', 'email', 'sms', 'zoom', 'google', 'microsoft'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Multiple-districts (top-level federation grouping, e.g. MD-323)
-- ---------------------------------------------------------------------
create table if not exists public.multiple_districts (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  country text not null default 'India',
  council_chairperson_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------
-- Districts (e.g. 3232 FI)
-- ---------------------------------------------------------------------
create table if not exists public.districts (
  id uuid primary key default uuid_generate_v4(),
  multiple_district_id uuid references public.multiple_districts(id) on delete set null,
  code text not null unique,
  name text not null,
  governor_name text,
  cabinet_secretary_name text,
  cabinet_treasurer_name text,
  lions_year text, -- e.g. "2025-26"
  source_id text,  -- external Lions Portal ID, if synced
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_districts_md on public.districts(multiple_district_id);

-- ---------------------------------------------------------------------
-- Regions & Zones (mid-level groupings within a district)
-- ---------------------------------------------------------------------
create table if not exists public.regions (
  id uuid primary key default uuid_generate_v4(),
  district_id uuid not null references public.districts(id) on delete cascade,
  code text not null,
  name text not null,
  chairperson_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (district_id, code)
);

create table if not exists public.zones (
  id uuid primary key default uuid_generate_v4(),
  region_id uuid references public.regions(id) on delete set null,
  district_id uuid not null references public.districts(id) on delete cascade,
  code text not null,
  name text not null,
  chairperson_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (district_id, code)
);

create index if not exists idx_zones_region on public.zones(region_id);

-- ---------------------------------------------------------------------
-- Extend clubs to participate in the hierarchy
-- ---------------------------------------------------------------------
alter table public.clubs
  add column if not exists district_id uuid references public.districts(id) on delete set null,
  add column if not exists zone_id uuid references public.zones(id) on delete set null,
  add column if not exists region_id uuid references public.regions(id) on delete set null,
  add column if not exists club_number text,
  add column if not exists source_id text,
  add column if not exists meeting_schedule jsonb,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_clubs_district_id on public.clubs(district_id);
create index if not exists idx_clubs_zone on public.clubs(zone_id);

-- ---------------------------------------------------------------------
-- Extend members with federation-wide identity
-- ---------------------------------------------------------------------
alter table public.members
  add column if not exists district_id uuid references public.districts(id) on delete set null,
  add column if not exists lions_member_id text unique,
  add column if not exists lions_role lions_role,
  add column if not exists birthday date,
  add column if not exists whatsapp text,
  add column if not exists last_sync_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_members_district on public.members(district_id);
create index if not exists idx_members_lions on public.members(lions_member_id);

-- ---------------------------------------------------------------------
-- Officer history — track who held which post when
-- ---------------------------------------------------------------------
create table if not exists public.officers (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.members(id) on delete cascade,
  scope_kind text not null check (scope_kind in ('club','zone','region','district','multiple_district','international')),
  scope_id uuid,
  role lions_role not null,
  term_start date not null,
  term_end date,
  status officer_term_status not null default 'active',
  appointed_by uuid references public.members(id) on delete set null,
  source_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_officers_member on public.officers(member_id);
create index if not exists idx_officers_scope on public.officers(scope_kind, scope_id);
create index if not exists idx_officers_role on public.officers(role);
create index if not exists idx_officers_term on public.officers(term_start, term_end);

-- ---------------------------------------------------------------------
-- OAuth / OIDC accounts (link Lions IdP identity to local user)
-- ---------------------------------------------------------------------
create table if not exists public.oauth_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  provider text not null,             -- e.g. 'lions', 'google', 'microsoft'
  subject text not null,              -- 'sub' from the IdP
  email text,
  email_verified boolean,
  raw_profile jsonb,
  access_token text,
  refresh_token text,
  id_token text,
  token_type text,
  scope text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, subject)
);

create index if not exists idx_oauth_user on public.oauth_accounts(user_id);
create index if not exists idx_oauth_member on public.oauth_accounts(member_id);

-- ---------------------------------------------------------------------
-- OAuth sessions (device + session tracking; complementary to Supabase auth)
-- ---------------------------------------------------------------------
create table if not exists public.oauth_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  oauth_account_id uuid references public.oauth_accounts(id) on delete cascade,
  session_token_hash text not null unique,
  user_agent text,
  ip_address inet,
  device_label text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_oauth_sessions_user on public.oauth_sessions(user_id);
create index if not exists idx_oauth_sessions_expiry on public.oauth_sessions(expires_at);

-- ---------------------------------------------------------------------
-- Attendance (events + meetings; QR-friendly)
-- ---------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.members(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  club_id uuid references public.clubs(id) on delete set null,
  occurred_at timestamptz not null default now(),
  status attendance_status not null default 'present',
  check_in_method text, -- 'qr','manual','geofence','remote'
  check_in_location jsonb,
  recorded_by uuid references public.members(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (member_id, event_id)
);

create index if not exists idx_attendance_member on public.attendance(member_id);
create index if not exists idx_attendance_event on public.attendance(event_id);
create index if not exists idx_attendance_occurred on public.attendance(occurred_at);

-- ---------------------------------------------------------------------
-- Committees & memberships
-- ---------------------------------------------------------------------
create table if not exists public.committees (
  id uuid primary key default uuid_generate_v4(),
  scope_kind text not null check (scope_kind in ('club','zone','region','district','multiple_district')),
  scope_id uuid not null,
  name text not null,
  description text,
  chairperson_id uuid references public.members(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.committee_members (
  id uuid primary key default uuid_generate_v4(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  role text,
  joined_at date default current_date,
  left_at date,
  unique (committee_id, member_id, joined_at)
);

-- ---------------------------------------------------------------------
-- Trainings
-- ---------------------------------------------------------------------
create table if not exists public.trainings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  provider text,
  starts_at timestamptz,
  ends_at timestamptz,
  certificate_template text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_completions (
  id uuid primary key default uuid_generate_v4(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  completed_on date not null default current_date,
  score numeric(5,2),
  certificate_url text,
  source_id text,
  created_at timestamptz not null default now(),
  unique (training_id, member_id)
);

create index if not exists idx_training_completions_member on public.training_completions(member_id);

-- ---------------------------------------------------------------------
-- Awards (MJF, presidential, etc.)
-- ---------------------------------------------------------------------
create table if not exists public.awards (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.members(id) on delete cascade,
  award_name text not null,
  award_year text,
  category text,
  awarded_on date,
  awarded_by text,
  source_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_awards_member on public.awards(member_id);

-- ---------------------------------------------------------------------
-- Sync logs — every fetch/import attempt
-- ---------------------------------------------------------------------
create table if not exists public.sync_logs (
  id uuid primary key default uuid_generate_v4(),
  source sync_source not null,
  entity text not null,                  -- 'members','clubs','districts',...
  status sync_status not null default 'queued',
  triggered_by uuid references public.members(id) on delete set null,
  integration_id uuid,                   -- nullable FK; integrations created below
  started_at timestamptz,
  finished_at timestamptz,
  records_total integer default 0,
  records_inserted integer default 0,
  records_updated integer default 0,
  records_skipped integer default 0,
  records_failed integer default 0,
  cursor text,                           -- last seen cursor / page / timestamp
  error_message text,
  context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sync_logs_entity on public.sync_logs(entity);
create index if not exists idx_sync_logs_status on public.sync_logs(status);
create index if not exists idx_sync_logs_created on public.sync_logs(created_at desc);

-- ---------------------------------------------------------------------
-- Audit log — append-only record of significant actions
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_member_id uuid references public.members(id) on delete set null,
  actor_label text,                      -- fallback when no member (e.g. 'system','cron')
  action text not null,                  -- 'member.create','sync.run','oauth.login',...
  entity text,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  request_id text,
  payload jsonb,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_actor on public.audit_logs(actor_member_id);
create index if not exists idx_audit_action on public.audit_logs(action);
create index if not exists idx_audit_entity on public.audit_logs(entity, entity_id);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

-- ---------------------------------------------------------------------
-- Integration registry — runtime config for external connectors
-- ---------------------------------------------------------------------
create table if not exists public.integrations (
  id uuid primary key default uuid_generate_v4(),
  kind integration_kind not null,
  name text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb, -- non-secret config only
  secret_ref text,                            -- name of an env var or vault secret
  scope_kind text check (scope_kind in ('global','multiple_district','district','club')),
  scope_id uuid,
  health_status text default 'unknown',
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, name)
);

create index if not exists idx_integrations_scope on public.integrations(scope_kind, scope_id);

do $$ begin
  alter table public.sync_logs
    add constraint sync_logs_integration_fk
    foreign key (integration_id) references public.integrations(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- updated_at triggers (reuse existing trigger fn from 0001)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'multiple_districts','districts','regions','zones',
      'officers','oauth_accounts','oauth_sessions',
      'committees','trainings','integrations'
    ])
  loop
    execute format(
      'drop trigger if exists trg_%s_updated on public.%s;', t, t
    );
    execute format(
      'create trigger trg_%s_updated before update on public.%s
       for each row execute function public.set_updated_at();', t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.multiple_districts enable row level security;
alter table public.districts          enable row level security;
alter table public.regions            enable row level security;
alter table public.zones              enable row level security;
alter table public.officers           enable row level security;
alter table public.oauth_accounts     enable row level security;
alter table public.oauth_sessions     enable row level security;
alter table public.attendance         enable row level security;
alter table public.committees         enable row level security;
alter table public.committee_members  enable row level security;
alter table public.trainings          enable row level security;
alter table public.training_completions enable row level security;
alter table public.awards             enable row level security;
alter table public.sync_logs          enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.integrations       enable row level security;

-- Authenticated members can read hierarchy
do $$ begin
  create policy hierarchy_read_md on public.multiple_districts
    for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy hierarchy_read_d on public.districts
    for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy hierarchy_read_r on public.regions
    for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy hierarchy_read_z on public.zones
    for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Members can read their own oauth_accounts / sessions
do $$ begin
  create policy oauth_own on public.oauth_accounts
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy oauth_sessions_own on public.oauth_sessions
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Audit & sync logs: read-only for authenticated; writes via service role only.
do $$ begin
  create policy audit_read on public.audit_logs
    for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy sync_read on public.sync_logs
    for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Federation bootstrap (DEPLOYMENT.md §8) — safe to re-run, idempotent.
-- =====================================================================

insert into public.multiple_districts (code, name, country)
values ('MD-3232', 'Multiple District 3232', 'India')
on conflict (code) do nothing;

insert into public.districts (code, name, multiple_district_id, lions_year)
select '3232 FI', 'District 3232 FI', md.id, '2025-26'
from public.multiple_districts md
where md.code = 'MD-3232'
on conflict (code) do nothing;

-- Link the existing Baroda Rising Star club row to the new district.
update public.clubs
   set district_id = (select id from public.districts where code = '3232 FI')
 where name = 'Lions Club of Baroda Rising Star'
   and district_id is null;

-- Promote your admin to international_admin. Adjust the email if needed.
update public.members
   set lions_role = 'international_admin',
       status = 'active'
 where email = 'admin@lcbrising.org';

-- Verification queries (results visible in the SQL editor)
select 'multiple_districts' as table, count(*) as rows from public.multiple_districts
union all select 'districts',  count(*) from public.districts
union all select 'regions',    count(*) from public.regions
union all select 'zones',      count(*) from public.zones
union all select 'officers',   count(*) from public.officers
union all select 'oauth_accounts', count(*) from public.oauth_accounts
union all select 'audit_logs', count(*) from public.audit_logs
union all select 'sync_logs',  count(*) from public.sync_logs;
