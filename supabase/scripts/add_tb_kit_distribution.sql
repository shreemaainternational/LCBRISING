-- =====================================================================
-- Real activity insert — TB Kit Distribution (26 Dec 2024)
-- =====================================================================
-- Source: club activity report (Activity No. 2).
--   Date         : 26/12/2024, 09:30 AM – 11:30 AM
--   Beneficiaries: 620
--   Lions present: 16 volunteers
--   Service hours: 32 (16 × 2)
--   Expenditure  : ₹5,500
--   Venue        : Urban Health Center, Warasiya, Vadodara
--
-- Surfaces in both:
--   • Public website  → home page "Recent Activities" (latest 3 by date)
--   • CRM admin        → /admin/activities (and the activity detail page)
-- since both read public.activities.
--
-- SELF-BOOTSTRAPPING + idempotent: safe to run on a fresh, partially
-- migrated, or fully migrated database. It will:
--   1. ensure the pgcrypto extension (for gen_random_uuid),
--   2. create public.activities if it is missing,
--   3. add any columns this insert needs if they are missing,
--   4. insert the row only if it isn't already present (title + date).
--
-- Run via the "Apply database migration" workflow with
--   sql_path = supabase/scripts/add_tb_kit_distribution.sql
-- =====================================================================

-- 1. UUID generator used by the table default.
create extension if not exists pgcrypto;

-- 2. Ensure the table exists. The full migration (0001 + 0020 + 0045)
--    defines more columns/constraints; this fallback covers the case
--    where migrations have not been applied yet. `if not exists` means
--    it is a no-op on a real, already-migrated database. The club_id FK
--    is intentionally omitted here so the fallback never depends on the
--    clubs table existing.
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  club_id uuid,
  title text not null,
  description text,
  category text,
  beneficiaries int not null default 0,
  service_hours numeric(10,2) not null default 0,
  amount_raised numeric(10,2) not null default 0,
  date date not null default current_date,
  location text,
  photos text[] default '{}',
  reported_to_district boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Ensure every extended column this insert touches is present.
alter table public.activities
  add column if not exists category              text,
  add column if not exists volunteer_hours_total numeric(10,2) not null default 0,
  add column if not exists lion_members_count    int           not null default 0,
  add column if not exists budget                numeric(12,2) not null default 0,
  add column if not exists expenses              numeric(12,2) not null default 0,
  add column if not exists is_medical_camp       boolean       not null default false,
  add column if not exists status                text          not null default 'completed',
  add column if not exists location              text,
  add column if not exists reported_to_district  boolean       not null default false;

-- Make sure the public site can read it (no-op if policy/RLS already set).
alter table public.activities enable row level security;
do $$ begin
  create policy "activities_public_read" on public.activities
    for select using (true);
exception when duplicate_object then null; end $$;

-- 4. Insert the activity (guarded; attaches to the home club if present).
do $$
declare
  v_club_id uuid;
begin
  if to_regclass('public.clubs') is not null then
    execute $q$
      select id from public.clubs
       where name = 'Lions Club of Baroda Rising Star' limit 1
    $q$ into v_club_id;
  end if;

  insert into public.activities (
    club_id,
    title,
    description,
    category,
    beneficiaries,
    service_hours,
    volunteer_hours_total,
    lion_members_count,
    amount_raised,
    budget,
    expenses,
    date,
    location,
    is_medical_camp,
    status,
    reported_to_district
  )
  select
    v_club_id,
    'TB Kit Distribution',
    'Distribution of TB nutrition support kits to patients at the Urban Health '
      || 'Center, Warasiya, Vadodara. Held 09:30 AM – 11:30 AM with 16 Lions '
      || 'volunteers contributing 32 service hours (16 × 2). 620 beneficiaries '
      || 'reached. Expenditure ₹5,500.',
    'healthcare',
    620,
    32,
    32,
    16,
    0,
    5500,
    5500,
    date '2024-12-26',
    'Urban Health Center, Warasiya, Vadodara',
    true,
    'completed',
    false
  where not exists (
    select 1 from public.activities
     where title = 'TB Kit Distribution'
       and date  = date '2024-12-26'
  );
end $$;
