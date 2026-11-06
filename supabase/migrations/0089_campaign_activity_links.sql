-- =====================================================================
-- 0080_campaign_activity_links.sql
-- Cross-connects the content modules audited on /stories, /campaigns
-- and /blog:
--   * campaign_activities: many-to-many between campaigns and the
--     activities they report on, so /campaigns/[slug] can list real
--     linked activities and compute totals (beneficiaries, volunteers,
--     lion hours, expenses) from actual activity rows instead of
--     hardcoding them.
--   * stories.activity_id: a story can spotlight the specific service
--     activity that produced it (stories.campaign_id already existed
--     but was never read by any query — this adds the activity side).
-- Additive only — no existing table, column, or row is altered/dropped.
-- =====================================================================

create table if not exists public.campaign_activities (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, activity_id)
);

create index if not exists idx_campaign_activities_activity
  on public.campaign_activities (activity_id);

alter table public.campaign_activities enable row level security;

do $$ begin
  create policy campaign_activities_public_read on public.campaign_activities
    for select using (
      exists (select 1 from public.campaigns c where c.id = campaign_id and c.is_active)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy campaign_activities_admin on public.campaign_activities for all using (
    exists (select 1 from public.members m where m.user_id = auth.uid()
            and m.role in ('admin','president','secretary','treasurer','officer'))
  ) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- stories.activity_id — "Related Service Activity" on a story.
-- ---------------------------------------------------------------------
alter table public.stories
  add column if not exists activity_id uuid references public.activities(id) on delete set null;

create index if not exists idx_stories_activity on public.stories(activity_id);
