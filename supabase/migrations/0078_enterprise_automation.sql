-- =====================================================================
-- Enterprise AI Automation Conductor.
--
-- A supervisory layer that runs the whole automation platform as one
-- orchestrated pipeline on a schedule (and on-demand from the admin UI):
--
--   1. Lions Portal auto-fetch  — pull districts / clubs / members and
--      update the system (reuses runLionsAutoSync).
--   2. Self-heal                — revive transiently-failed sync jobs and
--      un-stick automation jobs abandoned mid-run.
--   3. Automation jobs          — schedule + drain the automation_jobs
--      queue (dues reminders, greetings, officer digest, invoices).
--   4. Integration health       — snapshot the live/degraded/off registry.
--   5. AI health digest         — an OpenAI-written ops summary + the one
--      recommended next action (deterministic fallback when no key).
--   6. Auto-alert               — audit + best-effort push when the run
--      regresses, so admins hear about breakage without watching a dashboard.
--
-- Self-contained + idempotent: safe to run even if 0066 / 0077 never ran
-- here. Creates automation_settings when missing and adds the three new
-- conductor toggles. All three default ON so the conductor starts working
-- as soon as a scheduler hits /api/cron/enterprise. Turn them off from the
-- Automation admin page.
-- =====================================================================

-- --------------------------------------------------------------------
-- automation_settings — create if the base migration (0066) hasn't run
-- here yet, then ensure the conductor toggle columns exist either way.
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
  add column if not exists lions_auto_sync_enabled       boolean not null default true,
  add column if not exists lions_auto_dedupe_enabled     boolean not null default true,
  add column if not exists enterprise_automation_enabled boolean not null default true,
  add column if not exists auto_heal_enabled             boolean not null default true,
  add column if not exists auto_alert_enabled            boolean not null default true;

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
-- automation_conductor_state — singleton record of the most recent
-- conductor run, so the admin UI can show "last run / health score /
-- per-step outcome / AI summary" without scanning the history table.
-- --------------------------------------------------------------------
create table if not exists public.automation_conductor_state (
  id text primary key default 'singleton' check (id = 'singleton'),
  last_run_at          timestamptz,
  last_status          text,                       -- 'healthy'|'degraded'|'critical'|'failed'|'skipped'
  last_trigger         text,                       -- 'cron'|'manual'
  health_score         integer not null default 0, -- 0..100
  duration_ms          integer not null default 0,
  steps                jsonb   not null default '[]'::jsonb,   -- [{ key, status, detail, counts }]
  counts               jsonb   not null default '{}'::jsonb,   -- rolled-up totals
  ai_summary           text,                       -- AI (or template) ops digest
  ai_recommendation    text,                       -- single recommended next action
  ai_source            text,                       -- 'ai' | 'template'
  consecutive_failures integer not null default 0,
  updated_at           timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

alter table public.automation_conductor_state enable row level security;

-- --------------------------------------------------------------------
-- automation_conductor_log — bounded history of conductor runs for the
-- "Recent runs" table + trend. The orchestrator trims to the newest 200.
-- --------------------------------------------------------------------
create table if not exists public.automation_conductor_log (
  id           uuid primary key default uuid_generate_v4(),
  ran_at       timestamptz not null default now(),
  trigger      text,
  status       text,
  health_score integer not null default 0,
  duration_ms  integer not null default 0,
  counts       jsonb   not null default '{}'::jsonb,
  ai_summary   text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_conductor_log_ran_at
  on public.automation_conductor_log (ran_at desc);

alter table public.automation_conductor_log enable row level security;

-- Admins + top Lions roles can read the conductor tables. Writes go
-- through the service-role client, which bypasses RLS.
do $$ begin
  create policy automation_conductor_state_admin on public.automation_conductor_state
    for all using (
      exists (
        select 1 from public.members m
        where m.user_id = auth.uid()
          and (m.role = 'admin'
               or m.lions_role in ('international_admin','multiple_district_admin','district_governor'))
      )
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy automation_conductor_log_admin on public.automation_conductor_log
    for all using (
      exists (
        select 1 from public.members m
        where m.user_id = auth.uid()
          and (m.role = 'admin'
               or m.lions_role in ('international_admin','multiple_district_admin','district_governor'))
      )
    ) with check (true);
exception when duplicate_object then null; end $$;

insert into public.automation_conductor_state (id) values ('singleton')
on conflict (id) do nothing;
