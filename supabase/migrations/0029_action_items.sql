-- =====================================================================
-- First-class action-item tracker. Action items can be created
-- standalone or as a side-effect of meeting minutes — but they live
-- in their own table so they can be assigned, reminded, escalated and
-- closed independently.
-- =====================================================================

do $$ begin
  create type action_item_status as enum ('open', 'in_progress', 'blocked', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type action_item_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

create table if not exists public.zone_action_items (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  region_id uuid references public.regions(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,
  agenda_id uuid references public.zone_agenda(id) on delete set null,
  minutes_id uuid references public.zone_meeting_minutes(id) on delete set null,
  club_id uuid references public.clubs(id) on delete set null,
  title text not null,
  details text,
  status action_item_status not null default 'open',
  priority action_item_priority not null default 'medium',
  owner_member_id uuid references public.members(id) on delete set null,
  owner_name text,                          -- in case the owner isn't a member yet
  watchers uuid[] not null default '{}',
  due_date date,
  done_at timestamptz,
  blocked_reason text,
  last_reminder_at timestamptz,
  reminder_count int not null default 0,
  remind_channel text default 'email',      -- 'email' | 'whatsapp' | 'sms' | 'push'
  remind_when_due_in_days int default 1,
  is_pinned boolean not null default false,
  tags text[] not null default '{}',
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_zone_ai_zone on public.zone_action_items(zone_id);
create index if not exists idx_zone_ai_owner on public.zone_action_items(owner_member_id);
create index if not exists idx_zone_ai_status on public.zone_action_items(status);
create index if not exists idx_zone_ai_due on public.zone_action_items(due_date);
create index if not exists idx_zone_ai_minutes on public.zone_action_items(minutes_id);
create index if not exists idx_zone_ai_pinned on public.zone_action_items(zone_id, is_pinned desc);

do $$ begin
  drop trigger if exists set_updated_zone_ai on public.zone_action_items;
  create trigger set_updated_zone_ai before update on public.zone_action_items
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.zone_action_items enable row level security;

do $$ begin
  create policy zone_ai_admin_all on public.zone_action_items
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy zone_ai_chair on public.zone_action_items
    for all using (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
      or region_id in (
        select r.id from public.regions r
        join public.members m on m.id = r.chairperson_member_id
        where m.user_id = auth.uid()
      )
    ) with check (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
      or region_id in (
        select r.id from public.regions r
        join public.members m on m.id = r.chairperson_member_id
        where m.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- Owners can see their own items.
do $$ begin
  create policy zone_ai_owner_read on public.zone_action_items
    for select using (
      owner_member_id in (select id from public.members where user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
