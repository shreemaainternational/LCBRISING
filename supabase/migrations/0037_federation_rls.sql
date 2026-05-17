-- =====================================================================
-- Federation-table RLS write policies for admin/officer members.
-- Previously zones / regions / districts / multiple_districts had RLS
-- enabled but no policy allowing the admin-UI to insert via the
-- authenticated user's session. When SUPABASE_SERVICE_ROLE_KEY is not
-- correctly configured, the QuickAdd forms returned "Invalid API key".
--
-- These policies let any logged-in admin/president/secretary/treasurer/
-- officer member do CRUD on the federation tree. Service-role still
-- bypasses RLS as before.
-- =====================================================================

-- Make sure RLS is on (idempotent — alters are no-ops if already on).
alter table public.zones                enable row level security;
alter table public.regions              enable row level security;
alter table public.districts            enable row level security;
alter table public.multiple_districts   enable row level security;

-- ---------- zones --------------------------------------------------
do $$ begin
  create policy zones_read_authenticated on public.zones
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy zones_admin_write on public.zones
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    );
exception when duplicate_object then null; end $$;

-- ---------- regions ------------------------------------------------
do $$ begin
  create policy regions_read_authenticated on public.regions
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy regions_admin_write on public.regions
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    );
exception when duplicate_object then null; end $$;

-- ---------- districts ----------------------------------------------
do $$ begin
  create policy districts_read_authenticated on public.districts
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy districts_admin_write on public.districts
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    );
exception when duplicate_object then null; end $$;

-- ---------- multiple_districts -------------------------------------
do $$ begin
  create policy md_read_authenticated on public.multiple_districts
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy md_admin_write on public.multiple_districts
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    );
exception when duplicate_object then null; end $$;
