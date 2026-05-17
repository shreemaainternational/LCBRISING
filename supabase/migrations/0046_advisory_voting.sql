-- =====================================================================
-- Digital voting attached to advisories. A zone chair / DG can issue an
-- advisory that requires a yes/no/multi-choice response from member
-- presidents within a closing window. We tally the votes in real time.
-- =====================================================================

alter table public.advisories
  add column if not exists voting_enabled boolean not null default false,
  add column if not exists voting_question text,
  add column if not exists voting_options jsonb default '[]'::jsonb,
  add column if not exists voting_closes_at timestamptz,
  add column if not exists voting_allow_change boolean not null default true,
  add column if not exists voting_anonymous boolean not null default false;

create table if not exists public.advisory_votes (
  id uuid primary key default uuid_generate_v4(),
  advisory_id uuid not null references public.advisories(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  option_value text not null,
  comment text,
  voted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (advisory_id, member_id)
);

create index if not exists idx_advisory_votes_advisory on public.advisory_votes(advisory_id);
create index if not exists idx_advisory_votes_member on public.advisory_votes(member_id);

do $$ begin
  drop trigger if exists set_updated_advisory_votes on public.advisory_votes;
  create trigger set_updated_advisory_votes before update on public.advisory_votes
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.advisory_votes enable row level security;

-- Members can read votes for advisories addressed to their club + cast/
-- update their own. Admins see everything.
do $$ begin
  create policy advisory_votes_read on public.advisory_votes
    for select using (
      exists (select 1 from public.members me where me.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy advisory_votes_own on public.advisory_votes
    for all using (
      exists (
        select 1 from public.members me
         where me.user_id = auth.uid() and me.id = advisory_votes.member_id
      )
    ) with check (
      exists (
        select 1 from public.members me
         where me.user_id = auth.uid() and me.id = advisory_votes.member_id
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy advisory_votes_admin on public.advisory_votes
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;
