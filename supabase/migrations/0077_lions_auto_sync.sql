-- =====================================================================
-- Lions Portal auto-sync (enterprise automation).
--
-- Adds two automation toggles and a singleton state row so the platform
-- can fetch district / club / member data from the Lions Portal on a
-- schedule and update the system automatically — no human clicking
-- "Sync All". An AI duplicate pass can run after each fetch to flag
-- merged-member candidates for review.
--
-- Both toggles default to ON so the automation starts working as soon as
-- a scheduler hits /api/cron/lions-sync. Turn them off from the
-- Automation admin page.
-- =====================================================================

alter table public.automation_settings
  add column if not exists lions_auto_sync_enabled   boolean not null default true,
  add column if not exists lions_auto_dedupe_enabled boolean not null default true;

-- Singleton row that records the outcome of the most recent automated run,
-- so the admin UI can show "last run / next run / last status" without
-- scanning sync_logs. sync_logs still holds the per-entity detail.
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
