-- =====================================================================
-- Self-managed Web Push (VAPID) keys. A singleton row stores the keypair
-- that web-push uses to sign notifications.
--
-- VAPID keys are ECDSA P-256 — generating them inside Postgres is awkward,
-- so we leave the row empty on first install and have the runtime helper
-- in src/lib/push-config.ts lazy-create them via webpush.generateVAPIDKeys()
-- the first time the platform needs them. Admins can rotate from
-- /admin/integrations/push.
-- =====================================================================

create table if not exists public.push_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  public_key text,
  private_key text,
  subject text default 'mailto:admin@lcbaroda.org',
  last_rotated_at timestamptz,
  last_rotated_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  drop trigger if exists set_updated_push on public.push_settings;
  create trigger set_updated_push before update on public.push_settings
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.push_settings enable row level security;

do $$ begin
  create policy push_admin on public.push_settings
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;

-- Seed an empty singleton so we can UPDATE it on first generate.
insert into public.push_settings (id) values ('singleton')
on conflict (id) do nothing;
