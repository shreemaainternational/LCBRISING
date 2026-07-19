-- =====================================================================
-- Fix the frozen "TOTAL VISITORS" footer counter.
--
-- Migration 0051 created public.site_counters but NOT the atomic
-- increment RPC the tracker depends on. The RPC only ever existed in
-- supabase/scripts/ (create_site_counters.sql / apply_all_pending.sql),
-- which are applied by hand — so on any database provisioned purely
-- through the migration path the function is absent.
--
-- Effect of the missing function: POST /api/track calls
-- supa.rpc('increment_visits'), Postgres raises "function
-- public.increment_visits() does not exist", the route 500s, and
-- PageViewBeacon silently swallows the error. site_counters.value never
-- leaves 0, so the footer shows only the app-side baseline (25,889)
-- forever — the counter appears frozen / "not counting".
--
-- This migration adds the RPC (and defensively re-ensures the table,
-- seed row, grants and read policy) so the counter increments on every
-- tracked visit. Idempotent — safe to re-run.
-- =====================================================================

create table if not exists public.site_counters (
  key text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- `value` holds ONLY real tracked visits and starts at 0. The public
-- baseline is added app-side (VISITOR_BASELINE in Footer.tsx); do NOT
-- seed it here or it double-counts.
insert into public.site_counters (key, value)
values ('visits', 0)
on conflict (key) do nothing;

create or replace function public.increment_visits()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_value bigint;
begin
  update public.site_counters
     set value = value + 1,
         updated_at = now()
   where key = 'visits'
   returning value into new_value;

  if new_value is null then
    insert into public.site_counters (key, value)
    values ('visits', 1)
    on conflict (key) do update set value = site_counters.value + 1
    returning value into new_value;
  end if;

  return new_value;
end;
$$;

grant execute on function public.increment_visits() to anon, authenticated;

alter table public.site_counters enable row level security;

do $$ begin
  create policy site_counters_read on public.site_counters
    for select using (true);
exception when duplicate_object then null; end $$;
