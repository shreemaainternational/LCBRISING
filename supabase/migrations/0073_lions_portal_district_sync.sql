-- =====================================================================
-- Lions International Portal — District data sync via DG login
--
-- Adds a credential-based ("district governor login") sync path that
-- sits next to the existing REST adapter (0031). A District Governor's
-- Lions Member Portal / MyLCI login is stored ENCRYPTED (AES-256-GCM via
-- SECRET_ENCRYPTION_KEY, see src/lib/crypto/secret-box.ts); the sync
-- exchanges it for a session at a configurable login/token endpoint and
-- pulls district data.
--
-- To make the local district table "match the Lions Portal", the
-- districts table is widened with the district fields Lions International
-- exposes (multiple district, constitutional area, status, VDGs, cabinet
-- officers, club/member/region/zone counts, effective date, website) plus
-- a portal_raw jsonb that keeps the untouched upstream record for audit.
-- Every column is added idempotently so this is safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Widen districts to the Lions Portal shape
-- ---------------------------------------------------------------------
alter table public.districts
  add column if not exists multiple_district_code   text,
  add column if not exists constitutional_area      text,
  add column if not exists status                   text,
  add column if not exists first_vice_governor_name text,
  add column if not exists second_vice_governor_name text,
  add column if not exists governor_email           text,
  add column if not exists governor_phone           text,
  add column if not exists club_count               integer,
  add column if not exists member_count             integer,
  add column if not exists region_count             integer,
  add column if not exists zone_count               integer,
  add column if not exists effective_date           date,
  add column if not exists website                  text,
  add column if not exists last_portal_sync_at      timestamptz,
  add column if not exists portal_raw               jsonb;

comment on column public.districts.portal_raw is
  'Untouched district record as returned by the Lions Portal, kept for audit / re-mapping.';

-- ---------------------------------------------------------------------
-- 2. Encrypted District Governor portal credentials (singleton)
-- ---------------------------------------------------------------------
create table if not exists public.lions_portal_credentials (
  id text primary key default 'singleton' check (id = 'singleton'),
  -- Encrypted at rest (enc:v1:...). Never returned to the browser.
  username           text,
  password           text,
  -- Endpoint that trades username/password for a session/bearer token.
  login_url          text,
  -- Endpoint that returns district data once authenticated.
  data_url           text,
  -- Scope the pull to a single district (blank = whatever the DG can see).
  district_code      text,
  -- Cached session so we don't re-login on every sync.
  session_token      text,
  session_expires_at timestamptz,
  is_active          boolean not null default false,
  sandbox_mode       boolean not null default false,
  last_login_ok      boolean,
  last_login_at      timestamptz,
  last_login_error   text,
  last_sync_at       timestamptz,
  configured_by      uuid references public.members(id) on delete set null,
  configured_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

do $$ begin
  drop trigger if exists set_updated_lions_portal on public.lions_portal_credentials;
  create trigger set_updated_lions_portal before update on public.lions_portal_credentials
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.lions_portal_credentials enable row level security;

-- Admin-only. Service role (used by the sync) bypasses RLS anyway.
do $$ begin
  create policy lions_portal_admin on public.lions_portal_credentials
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;
