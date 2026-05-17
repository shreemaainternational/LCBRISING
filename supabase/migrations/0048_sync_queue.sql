-- =====================================================================
-- Durable sync queue with retry semantics. Adapters in src/lib/sync/*
-- still run synchronously when invoked directly — this queue lets us
-- (a) schedule sync jobs from any code path, (b) retry transient
-- failures with exponential backoff, (c) keep a forward ledger of
-- what's been pushed to Lions International so we never double-send.
-- =====================================================================

do $$ begin
  create type public.sync_queue_status as enum
    ('pending', 'claimed', 'processing', 'done', 'failed', 'dead');
exception when duplicate_object then null; end $$;

create table if not exists public.sync_queue (
  id uuid primary key default uuid_generate_v4(),
  source text not null,                          -- 'lions_rest' | 'csv' | etc
  entity text not null,                          -- 'members'|'clubs'|'officers'|...
  operation text not null default 'sync',        -- 'sync'|'push'|'pull'|'upsert'
  entity_id uuid,                                -- nullable — link to the CRM row
  external_id text,                              -- the Lions Intl identifier
  payload jsonb not null default '{}'::jsonb,
  status public.sync_queue_status not null default 'pending',
  priority smallint not null default 100,        -- lower = higher priority
  attempts smallint not null default 0,
  max_attempts smallint not null default 5,
  next_retry_at timestamptz not null default now(),
  last_error text,
  last_log_id uuid references public.sync_logs(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  claimed_by text,                               -- worker id
  triggered_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sync_queue_status_next
  on public.sync_queue (status, next_retry_at)
  where status in ('pending', 'claimed');
create index if not exists idx_sync_queue_entity on public.sync_queue (entity, status);
create index if not exists idx_sync_queue_external on public.sync_queue (external_id) where external_id is not null;

do $$ begin
  drop trigger if exists set_updated_sync_queue on public.sync_queue;
  create trigger set_updated_sync_queue before update on public.sync_queue
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.sync_queue enable row level security;

do $$ begin
  create policy sync_queue_admin on public.sync_queue
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Forward ledger: one row per (entity, entity_id) that records the last
-- confirmed push to the Lions ecosystem. Used by the sync dashboard so
-- we can show "Activities: 245/250 synced" without scanning sync_logs.
-- =====================================================================
create table if not exists public.sync_ledger (
  id uuid primary key default uuid_generate_v4(),
  entity text not null,
  entity_id uuid not null,
  external_id text,                              -- Lions Intl identifier
  source_hash text,                              -- sha256 of source payload
  last_status text not null default 'pending',
  last_synced_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity, entity_id)
);

create index if not exists idx_sync_ledger_entity_status on public.sync_ledger(entity, last_status);
create index if not exists idx_sync_ledger_external on public.sync_ledger(external_id) where external_id is not null;

do $$ begin
  drop trigger if exists set_updated_sync_ledger on public.sync_ledger;
  create trigger set_updated_sync_ledger before update on public.sync_ledger
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.sync_ledger enable row level security;

do $$ begin
  create policy sync_ledger_admin on public.sync_ledger
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;
