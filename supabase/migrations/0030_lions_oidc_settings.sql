-- Self-service OIDC configuration. A singleton row holds the runtime
-- override for the Lions OIDC settings — populated through the admin
-- UI at /admin/integrations/oidc and merged into env at request time.
create table if not exists public.lions_oidc_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  issuer text,
  client_id text,
  client_secret text,
  redirect_uri text,
  scopes text,
  audience text,
  provider_label text,
  discovery_url text,
  is_active boolean not null default false,
  configured_by uuid references public.members(id) on delete set null,
  configured_at timestamptz,
  last_test_ok boolean,
  last_test_at timestamptz,
  last_test_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  drop trigger if exists set_updated_lions_oidc on public.lions_oidc_settings;
  create trigger set_updated_lions_oidc before update on public.lions_oidc_settings
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.lions_oidc_settings enable row level security;

-- Admin-only read + write. Service role bypasses.
do $$ begin
  create policy lions_oidc_admin on public.lions_oidc_settings
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;
