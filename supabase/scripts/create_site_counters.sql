-- =====================================================================
-- Site visitor counter — single-row counter table with an RPC for
-- atomic increment-and-return. Used by the public footer's
-- 'TOTAL VISITORS' block.
-- =====================================================================

create table if not exists public.site_counters (
  key text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- `value` holds ONLY real tracked visits and starts at 0. The public
-- "TOTAL VISITORS" baseline (so the site never reads as brand-new) is a
-- presentation concern applied in the app (VISITOR_BASELINE in Footer.tsx),
-- added on top of this value. Do NOT seed the baseline here — that would
-- double-count it against the app-side baseline.
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

-- RLS
alter table public.site_counters enable row level security;

do $$ begin
  create policy site_counters_read on public.site_counters
    for select using (true);
exception when duplicate_object then null; end $$;
