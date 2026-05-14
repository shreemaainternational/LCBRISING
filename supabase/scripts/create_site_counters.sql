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

-- Seed with a baseline so the public counter never reads as brand-new.
-- If the row already exists with a lower value, bump it up to the
-- baseline (real tracked visits accumulate on top of this).
insert into public.site_counters (key, value)
values ('visits', 25889)
on conflict (key) do update
  set value = greatest(public.site_counters.value, 25889);

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
