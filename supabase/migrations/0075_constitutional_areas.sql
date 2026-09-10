-- =====================================================================
-- Constitutional Area — top of the Lions hierarchy, above Multiple
-- District (Constitutional Area → Multiple District → District → Region
-- → Zone → Club → Member). Mirrors the Lions portal "My CA" level.
-- Idempotent.
-- =====================================================================

create table if not exists public.constitutional_areas (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.multiple_districts
  add column if not exists constitutional_area_id uuid references public.constitutional_areas(id) on delete set null;

create index if not exists idx_md_ca on public.multiple_districts(constitutional_area_id);

do $$ begin
  drop trigger if exists set_updated_ca on public.constitutional_areas;
  create trigger set_updated_ca before update on public.constitutional_areas
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.constitutional_areas enable row level security;

do $$ begin
  create policy ca_read_authenticated on public.constitutional_areas
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ca_admin_write on public.constitutional_areas
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role in ('admin','president','secretary','treasurer','officer'))
    );
exception when duplicate_object then null; end $$;
