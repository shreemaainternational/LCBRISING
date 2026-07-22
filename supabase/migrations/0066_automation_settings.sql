-- =====================================================================
-- Automation toggles. A singleton row lets officers enable/disable the
-- scheduled comms (officer digest, birthday + anniversary greetings, dues
-- reminders) from the Automation admin page. Defaults are all ON so
-- behaviour is unchanged until an officer turns something off.
-- =====================================================================

create table if not exists public.automation_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  officer_digest_enabled        boolean not null default true,
  birthday_greetings_enabled    boolean not null default true,
  anniversary_greetings_enabled boolean not null default true,
  dues_reminders_enabled        boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

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
