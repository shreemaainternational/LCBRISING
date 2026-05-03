-- =====================================================================
-- Social + Creative Automation Module
-- Idempotent. Builds on 0001_initial_schema.sql.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type social_platform as enum ('facebook','instagram','linkedin','whatsapp','twitter','youtube');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft','queued','scheduled','published','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type creative_type as enum ('post','flyer','invitation','birthday','certificate','article','press_release','video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type creative_status as enum ('pending','rendering','ready','failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Creatives — anything rendered (Canva, AI image, etc.)
-- ---------------------------------------------------------------------
create table if not exists public.creatives (
  id uuid primary key default gen_random_uuid(),
  template_type creative_type not null,
  template_id text,                          -- canva template / brand template
  source text not null default 'canva',      -- 'canva' | 'ai' | 'upload'
  title text,
  data jsonb not null default '{}'::jsonb,   -- merge fields sent to renderer
  output_url text,
  thumbnail_url text,
  status creative_status not null default 'pending',
  external_id text,                          -- e.g. canva design id
  created_by uuid references public.members(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  event_id   uuid references public.events(id)     on delete set null,
  member_id  uuid references public.members(id)    on delete set null,
  donation_id uuid references public.donations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creatives_type    on public.creatives(template_type);
create index if not exists idx_creatives_status  on public.creatives(status);
create index if not exists idx_creatives_created on public.creatives(created_at);

-- ---------------------------------------------------------------------
-- Social posts — one row per platform
-- ---------------------------------------------------------------------
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  type creative_type not null default 'post',
  caption text,
  hashtags text[] default '{}',
  media_urls text[] default '{}',
  platform social_platform not null,
  status post_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_post_id text,
  external_url text,
  metrics jsonb not null default '{}'::jsonb,
  last_error text,
  creative_id uuid references public.creatives(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  event_id    uuid references public.events(id)     on delete set null,
  donation_id uuid references public.donations(id)  on delete set null,
  created_by  uuid references public.members(id)    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_status      on public.social_posts(status);
create index if not exists idx_posts_platform    on public.social_posts(platform);
create index if not exists idx_posts_scheduled   on public.social_posts(scheduled_at) where status = 'scheduled';
create index if not exists idx_posts_published   on public.social_posts(published_at);

-- ---------------------------------------------------------------------
-- Videos — separate from creatives because they have script/timing
-- ---------------------------------------------------------------------
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  script text,
  scenes jsonb not null default '[]'::jsonb,
  aspect_ratio text not null default '9:16',
  duration_seconds int,
  audio_url text,
  video_url text,
  thumbnail_url text,
  status creative_status not null default 'pending',
  provider text default 'cloudinary',
  external_id text,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_videos_status on public.videos(status);

-- ---------------------------------------------------------------------
-- AI generation log — for audit + cost tracking
-- ---------------------------------------------------------------------
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  prompt_type text not null,
  model text not null default 'gpt-4o-mini',
  language text default 'en',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(10,6),
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_gen_type on public.ai_generations(prompt_type);

-- ---------------------------------------------------------------------
-- Birthdays view — derived from members.joined_at + dob
-- (We don't have dob yet; add the column once.)
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.members add column dob date;
exception when duplicate_column then null; end $$;

create or replace view public.upcoming_birthdays as
select id, name, email, phone, dob,
       to_char(dob, 'MM-DD') as md
from public.members
where dob is not null and status = 'active';

-- ---------------------------------------------------------------------
-- updated_at triggers (re-uses set_updated_at() from 0001)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array['creatives','social_posts','videos']) loop
    execute format('drop trigger if exists trg_%s_updated on public.%s', t, t);
    execute format('create trigger trg_%s_updated before update on public.%s
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.creatives       enable row level security;
alter table public.social_posts    enable row level security;
alter table public.videos          enable row level security;
alter table public.ai_generations  enable row level security;

-- Wipe and recreate policies idempotently
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname='public' and tablename in
      ('creatives','social_posts','videos','ai_generations')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "creatives_admin_all"     on public.creatives     for all using (public.is_admin()) with check (public.is_admin());
create policy "social_posts_admin_all"  on public.social_posts  for all using (public.is_admin()) with check (public.is_admin());
create policy "videos_admin_all"        on public.videos        for all using (public.is_admin()) with check (public.is_admin());
create policy "ai_gen_admin_all"        on public.ai_generations for all using (public.is_admin()) with check (public.is_admin());

-- Public read for published social posts (so embed widgets work)
create policy "social_posts_public_read" on public.social_posts for select using (status = 'published');
