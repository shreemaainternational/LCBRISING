-- =====================================================================
-- Self-managed CRON secret. A singleton row stores the secret that
-- /api/cron/* handlers compare against. Auto-seeded on first apply
-- so Vercel cron jobs work out of the box. Admins can rotate the
-- value from /admin/integrations.
-- =====================================================================

create table if not exists public.cron_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  secret text not null,
  last_rotated_at timestamptz not null default now(),
  last_rotated_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  drop trigger if exists set_updated_cron on public.cron_settings;
  create trigger set_updated_cron before update on public.cron_settings
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.cron_settings enable row level security;

do $$ begin
  create policy cron_admin on public.cron_settings
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;

-- Seed a fresh random secret on first install. encode(gen_random_bytes(24), 'hex')
-- gives a 48-character lowercase hex token which is plenty for HMAC-grade auth.
insert into public.cron_settings (id, secret)
values ('singleton', encode(gen_random_bytes(24), 'hex'))
on conflict (id) do nothing;
