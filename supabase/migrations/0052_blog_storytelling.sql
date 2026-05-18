-- =====================================================================
-- Storytelling platform — extends blog_posts, adds stories +
-- beneficiaries, and enriches campaigns with hero/urgency fields.
-- Inspired by Lions Clubs International newsroom + CRY India campaigns.
-- =====================================================================

-- ---------------------------------------------------------------------
-- blog_posts: tags, language, reading time, featured flag, story type,
-- rendered body, view counter, SEO meta.
-- ---------------------------------------------------------------------
alter table public.blog_posts
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists language text not null default 'en',
  add column if not exists reading_time int,
  add column if not exists is_featured boolean not null default false,
  add column if not exists story_type text not null default 'news',
  add column if not exists body_html text,
  add column if not exists view_count bigint not null default 0,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists hero_quote text;

create index if not exists idx_blog_posts_featured
  on public.blog_posts(is_featured, published_at desc)
  where is_published = true and deleted_at is null;

create index if not exists idx_blog_posts_story_type
  on public.blog_posts(story_type, published_at desc);

create index if not exists idx_blog_posts_tags
  on public.blog_posts using gin (tags);

create index if not exists idx_blog_posts_language
  on public.blog_posts(language);

-- ---------------------------------------------------------------------
-- stories: human-impact spotlights (CRY-style beneficiary narratives).
-- Lighter weight than a blog post — focused on a single life.
-- ---------------------------------------------------------------------
create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  subtitle text,
  beneficiary_name text,
  beneficiary_age int,
  location text,
  hero_image text,
  before_image text,
  after_image text,
  body text,
  impact_quote text,
  impact_metric text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  tags text[] not null default '{}'::text[],
  is_featured boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_stories_published
  on public.stories(published_at desc)
  where is_published = true and deleted_at is null;

create index if not exists idx_stories_featured
  on public.stories(is_featured, published_at desc)
  where is_published = true;

create index if not exists idx_stories_campaign on public.stories(campaign_id);
create index if not exists idx_stories_tags on public.stories using gin (tags);

do $$ begin
  drop trigger if exists set_updated_stories on public.stories;
  create trigger set_updated_stories before update on public.stories
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.stories enable row level security;
do $$ begin
  create policy stories_public_read on public.stories
    for select using (is_published = true and deleted_at is null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy stories_admin on public.stories for all using (
    exists (select 1 from public.members m
            where m.user_id = auth.uid()
              and m.role in ('admin','president','secretary','officer'))
  ) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- beneficiaries: people we serve. Referenced by activities + stories.
-- ---------------------------------------------------------------------
create table if not exists public.beneficiaries (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  age int,
  gender text,
  location text,
  image_url text,
  cause text,
  short_story text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_beneficiaries_published
  on public.beneficiaries(is_published);

do $$ begin
  drop trigger if exists set_updated_beneficiaries on public.beneficiaries;
  create trigger set_updated_beneficiaries before update on public.beneficiaries
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.beneficiaries enable row level security;
do $$ begin
  create policy beneficiaries_public_read on public.beneficiaries
    for select using (is_published = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy beneficiaries_admin on public.beneficiaries for all using (
    exists (select 1 from public.members m
            where m.user_id = auth.uid()
              and m.role in ('admin','president','secretary','officer'))
  ) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- campaigns: hero asset + urgency / impact framing for the CRY-style
-- campaigns page.
-- ---------------------------------------------------------------------
alter table public.campaigns
  add column if not exists hero_image text,
  add column if not exists tagline text,
  add column if not exists impact_metric text,
  add column if not exists urgency text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists category text;

create index if not exists idx_campaigns_featured
  on public.campaigns(is_featured, is_active);

-- ---------------------------------------------------------------------
-- ai_generations: audit trail for blog/story AI runs (cost + tokens).
-- ---------------------------------------------------------------------
create table if not exists public.ai_generations (
  id uuid primary key default uuid_generate_v4(),
  kind text not null,                   -- 'blog_article' | 'seo' | 'title' | 'translate' | ...
  prompt text,
  model text,
  language text default 'en',
  prompt_tokens int default 0,
  completion_tokens int default 0,
  cost_usd numeric(10,4) default 0,
  output jsonb,
  member_id uuid references public.members(id) on delete set null,
  blog_post_id uuid references public.blog_posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_generations_member
  on public.ai_generations(member_id, created_at desc);

alter table public.ai_generations enable row level security;
do $$ begin
  create policy ai_gen_admin on public.ai_generations for all using (
    exists (select 1 from public.members m
            where m.user_id = auth.uid()
              and m.role in ('admin','president','secretary','officer'))
  ) with check (true);
exception when duplicate_object then null; end $$;
