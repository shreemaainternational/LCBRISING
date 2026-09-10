-- =====================================================================
-- Lions Portal auto-sync (enterprise automation).
--
-- Adds two automation toggles and a singleton state row so the platform
-- can fetch district / club / member data from the Lions Portal on a
-- schedule and update the system automatically — no human clicking
-- "Sync All". An AI duplicate pass can run after each fetch to flag
-- merged-member candidates for review.
--
-- Self-contained + idempotent: safe to run even if an environment never
-- applied 0066 (automation_settings). It creates that table when missing,
-- so a later 0066 run is a no-op. Both toggles default ON so the
-- automation starts working as soon as a scheduler hits
-- /api/cron/lions-sync. Turn them off from the Automation admin page.
-- =====================================================================

-- --------------------------------------------------------------------
-- automation_settings — create if the base migration (0066) hasn't run
-- here yet, then ensure the new toggle columns exist either way.
-- --------------------------------------------------------------------
create table if not exists public.automation_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  officer_digest_enabled        boolean not null default true,
  birthday_greetings_enabled    boolean not null default true,
  anniversary_greetings_enabled boolean not null default true,
  dues_reminders_enabled        boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.automation_settings
  add column if not exists lions_auto_sync_enabled   boolean not null default true,
  add column if not exists lions_auto_dedupe_enabled boolean not null default true;

alter table public.automation_settings enable row level security;

do $$ begin
  create policy automation_settings_admin on public.automation_settings
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;

insert into public.automation_settings (id) values ('singleton')
on conflict (id) do nothing;

-- --------------------------------------------------------------------
-- lions_auto_sync_state — singleton record of the most recent automated
-- run, so the admin UI can show "last run / next run / last status"
-- without scanning sync_logs. sync_logs still holds the per-entity detail.
-- --------------------------------------------------------------------
create table if not exists public.lions_auto_sync_state (
  id text primary key default 'singleton' check (id = 'singleton'),
  last_run_at            timestamptz,
  last_status            text,                 -- 'success' | 'partial' | 'failed' | 'skipped'
  last_trigger           text,                 -- 'cron' | 'manual'
  last_fetched           integer not null default 0,
  last_inserted          integer not null default 0,
  last_updated           integer not null default 0,
  last_skipped           integer not null default 0,
  last_errors            integer not null default 0,
  last_duplicates        integer not null default 0,
  last_duration_ms       integer not null default 0,
  last_error_message     text,
  consecutive_failures   integer not null default 0,
  updated_at             timestamptz not null default now(),
  created_at             timestamptz not null default now()
);

alter table public.lions_auto_sync_state enable row level security;

do $$ begin
  create policy lions_auto_sync_state_admin on public.lions_auto_sync_state
    for all using (
      exists (
        select 1 from public.members m
        where m.user_id = auth.uid()
          and (m.role = 'admin'
               or m.lions_role in ('international_admin','multiple_district_admin','district_governor'))
      )
    ) with check (true);
exception when duplicate_object then null; end $$;

insert into public.lions_auto_sync_state (id) values ('singleton')
on conflict (id) do nothing;
