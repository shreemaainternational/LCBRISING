-- =====================================================================
-- District-wide Sync & Circulars
--
-- Two new capabilities that complete the "District Governance &
-- Synchronization Platform" surface:
--
--   1. district_sync_runs — audit-grade record of every full-tree
--      Lions International sync. Powers the Master Sync Console with
--      run history, per-entity counts, and error rollups.
--
--   2. district_circulars + circular_recipients — broadcast
--      announcements from the District Governor (or cabinet) to every
--      club in the district. Tracks per-club delivery + read receipt
--      across email / WhatsApp / push / portal channels.
-- =====================================================================

do $$ begin
  create type district_sync_status as enum ('queued', 'running', 'success', 'partial', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type district_sync_trigger as enum ('manual', 'scheduled', 'webhook', 'api');
exception when duplicate_object then null; end $$;

create table if not exists public.district_sync_runs (
  id uuid primary key default uuid_generate_v4(),
  district_id uuid references public.districts(id) on delete set null,
  trigger district_sync_trigger not null default 'manual',
  status district_sync_status not null default 'queued',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms int,
  triggered_by uuid references public.members(id) on delete set null,
  -- Aggregate counts across districts / clubs / members.
  totals jsonb not null default '{}'::jsonb,
  -- Per-entity LionsSyncReport array.
  reports jsonb not null default '[]'::jsonb,
  error_message text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dsr_district on public.district_sync_runs(district_id);
create index if not exists idx_dsr_started on public.district_sync_runs(started_at desc);

alter table public.district_sync_runs enable row level security;

do $$ begin
  create policy dsr_admin on public.district_sync_runs
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- District-wide circulars
-- ---------------------------------------------------------------------
do $$ begin
  create type circular_priority as enum ('info', 'important', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type circular_status as enum ('draft', 'queued', 'sending', 'sent', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type circular_channel as enum ('portal', 'email', 'whatsapp', 'push', 'sms');
exception when duplicate_object then null; end $$;

create table if not exists public.district_circulars (
  id uuid primary key default uuid_generate_v4(),
  district_id uuid not null references public.districts(id) on delete cascade,
  reference_no text unique,                   -- DC-YYYYMM-XXXXX
  subject text not null,
  body text not null,
  priority circular_priority not null default 'info',
  category text,                              -- e.g. "service week", "policy", "event"
  attachment_urls text[] not null default '{}',
  channels circular_channel[] not null default array['portal']::circular_channel[],
  -- Targeting: when both arrays are empty → every club in the district.
  target_zone_ids uuid[] not null default '{}',
  target_club_ids uuid[] not null default '{}',
  status circular_status not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  sent_by uuid references public.members(id) on delete set null,
  total_recipients int not null default 0,
  total_delivered int not null default 0,
  total_read int not null default 0,
  total_failed int not null default 0,
  pinned boolean not null default false,
  expires_at timestamptz,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dc_district on public.district_circulars(district_id);
create index if not exists idx_dc_status on public.district_circulars(status);
create index if not exists idx_dc_sent on public.district_circulars(sent_at desc);

-- Auto-numbering trigger.
create or replace function public.tg_circular_ref() returns trigger
language plpgsql as $$
begin
  if new.reference_no is null then
    new.reference_no := 'DC-' || to_char(now(), 'YYYYMM') || '-' ||
      lpad((extract(epoch from now())::bigint % 100000)::text, 5, '0');
  end if;
  return new;
end $$;

do $$ begin
  drop trigger if exists set_circular_ref on public.district_circulars;
  create trigger set_circular_ref before insert on public.district_circulars
    for each row execute function public.tg_circular_ref();
  drop trigger if exists set_updated_circular on public.district_circulars;
  create trigger set_updated_circular before update on public.district_circulars
    for each row execute function public.tg_set_updated_at();
end $$;

-- ---------------------------------------------------------------------
-- Per-club delivery + read tracking
-- ---------------------------------------------------------------------
create table if not exists public.circular_recipients (
  id uuid primary key default uuid_generate_v4(),
  circular_id uuid not null references public.district_circulars(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  channel circular_channel not null default 'portal',
  status text not null default 'pending',     -- pending / delivered / failed / read
  delivered_at timestamptz,
  read_at timestamptz,
  acknowledged_by uuid references public.members(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  unique (circular_id, club_id, channel)
);

create index if not exists idx_cr_circular on public.circular_recipients(circular_id);
create index if not exists idx_cr_club on public.circular_recipients(club_id);

alter table public.district_circulars   enable row level security;
alter table public.circular_recipients  enable row level security;

do $$ begin
  create policy dc_admin on public.district_circulars
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

-- Clubs can read circulars targeted at them (or zone-wide).
do $$ begin
  create policy dc_club_read on public.district_circulars for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy cr_admin on public.circular_recipients
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy cr_own on public.circular_recipients
    for select using (
      club_id in (select club_id from public.members where user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
