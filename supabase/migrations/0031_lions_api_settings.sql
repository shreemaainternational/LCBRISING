-- Self-service Lions International REST API settings, sister to 0030.
create table if not exists public.lions_api_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  base_url text,
  api_key text,
  access_token text,
  district_code text,
  multi_district_code text,
  is_active boolean not null default false,
  last_test_ok boolean,
  last_test_at timestamptz,
  last_test_error text,
  configured_by uuid references public.members(id) on delete set null,
  configured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  drop trigger if exists set_updated_lions_api on public.lions_api_settings;
  create trigger set_updated_lions_api before update on public.lions_api_settings
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.lions_api_settings enable row level security;

do $$ begin
  create policy lions_api_admin on public.lions_api_settings
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;
