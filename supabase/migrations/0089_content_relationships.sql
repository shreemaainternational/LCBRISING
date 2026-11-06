-- =====================================================================
-- Content relationship wiring for /stories, /campaigns, /blog repair.
-- Purely additive (new columns default to null, new table is new) —
-- no existing data, table, or policy is altered destructively.
-- =====================================================================

-- ---------------------------------------------------------------------
-- stories.activity_id: lets a beneficiary story point at the Service
-- Activity that produced it (e.g. "TB Nutrition Kit Distribution").
-- ---------------------------------------------------------------------
alter table public.stories
  add column if not exists activity_id uuid references public.activities(id) on delete set null;

create index if not exists idx_stories_activity on public.stories(activity_id);

-- ---------------------------------------------------------------------
-- blog_posts.story_id / campaign_id: lets a newsroom post reference the
-- human story and/or campaign it is reporting on. A related Service
-- Activity is then reached transitively through the story or campaign
-- rather than duplicated as a third foreign key.
-- ---------------------------------------------------------------------
alter table public.blog_posts
  add column if not exists story_id uuid references public.stories(id) on delete set null,
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists idx_blog_posts_story on public.blog_posts(story_id);
create index if not exists idx_blog_posts_campaign on public.blog_posts(campaign_id);

-- ---------------------------------------------------------------------
-- campaign_activities: many-to-many link between a fundraising Campaign
-- and the Service Activities it funds/reports on. Lets /campaigns/[slug]
-- list "Related Activities" and compute Total Beneficiaries / Lion
-- Hours / Funds Raised dynamically from real public.activities rows
-- instead of hardcoding campaign statistics.
-- ---------------------------------------------------------------------
create table if not exists public.campaign_activities (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, activity_id)
);

create index if not exists idx_campaign_activities_campaign on public.campaign_activities(campaign_id);
create index if not exists idx_campaign_activities_activity on public.campaign_activities(activity_id);

alter table public.campaign_activities enable row level security;

do $$ begin
  create policy campaign_activities_public_read on public.campaign_activities
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy campaign_activities_admin on public.campaign_activities for all using (
    public.is_admin()
  ) with check (public.is_admin());
exception when duplicate_object then null; end $$;
