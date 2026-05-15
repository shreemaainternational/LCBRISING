-- =====================================================================
-- Web Push notification subscriptions
-- =====================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  member_id uuid references public.members(id) on delete cascade,
  user_agent text,
  topics text[] not null default '{}',
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_member on public.push_subscriptions(member_id);
create index if not exists idx_push_active on public.push_subscriptions(is_active);

do $$ begin
  drop trigger if exists set_updated_push on public.push_subscriptions;
  create trigger set_updated_push before update on public.push_subscriptions
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.push_subscriptions enable row level security;

do $$ begin
  create policy push_admin_all on public.push_subscriptions
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy push_own on public.push_subscriptions
    for all using (
      member_id in (select id from public.members where user_id = auth.uid())
    ) with check (true);
exception when duplicate_object then null; end $$;
