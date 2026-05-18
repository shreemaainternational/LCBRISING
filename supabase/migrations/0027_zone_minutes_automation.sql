-- =====================================================================
-- Zone Chairperson: meeting minutes + automation workflows
-- =====================================================================

-- --------- Meeting minutes (linked to a zone_agenda item) ----------
create table if not exists public.zone_meeting_minutes (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  agenda_id uuid references public.zone_agenda(id) on delete set null,
  title text not null,
  meeting_date timestamptz not null default now(),
  venue text,
  attendees jsonb not null default '[]'::jsonb,
  apologies jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  next_meeting_at timestamptz,
  notes_md text,
  attachment_urls text[] not null default '{}',
  signed_off_by uuid references public.members(id) on delete set null,
  signed_off_at timestamptz,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_minutes_zone on public.zone_meeting_minutes(zone_id);
create index if not exists idx_minutes_agenda on public.zone_meeting_minutes(agenda_id);
create index if not exists idx_minutes_date on public.zone_meeting_minutes(meeting_date desc);

do $$ begin
  drop trigger if exists set_updated_minutes on public.zone_meeting_minutes;
  create trigger set_updated_minutes before update on public.zone_meeting_minutes
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.zone_meeting_minutes enable row level security;

do $$ begin
  create policy minutes_admin_all on public.zone_meeting_minutes
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy minutes_chair on public.zone_meeting_minutes
    for all using (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
    ) with check (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- --------- Automation rules per zone ----------
do $$ begin
  create type zone_automation_kind as enum (
    'low_attendance_advisory',
    'missing_activity_reminder',
    'weekly_meeting_reminder',
    'monthly_report_publish',
    'birthday_wishes',
    'overdue_dues_nudge',
    'csr_partner_check_in',
    'new_member_welcome'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type zone_automation_channel as enum ('whatsapp', 'email', 'sms', 'push', 'advisory');
exception when duplicate_object then null; end $$;

create table if not exists public.zone_automations (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  kind zone_automation_kind not null,
  channel zone_automation_channel not null default 'advisory',
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  cadence text,                            -- e.g. "weekly:mon@09:00", "monthly:1@09:00"
  last_run_at timestamptz,
  last_status text,
  last_result jsonb,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (zone_id, kind)
);

create index if not exists idx_zone_automation_active on public.zone_automations(zone_id, is_active);

do $$ begin
  drop trigger if exists set_updated_zone_automation on public.zone_automations;
  create trigger set_updated_zone_automation before update on public.zone_automations
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.zone_automations enable row level security;

do $$ begin
  create policy zone_auto_admin_all on public.zone_automations
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy zone_auto_chair on public.zone_automations
    for all using (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
    ) with check (
      zone_id in (
        select z.id from public.zones z
        join public.members m on m.id = z.chairperson_member_id
        where m.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
