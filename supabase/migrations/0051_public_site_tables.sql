-- =====================================================================
-- Tables the public site components reference but the schema never had.
-- All five are non-fatal (queries return empty) but the features they
-- back silently no-op until these tables exist.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Blog posts (/blog public page, /admin/* future editor)
-- ---------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  excerpt text,
  body text,
  cover_url text,
  category text,
  author_name text,
  author_member_id uuid references public.members(id) on delete set null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_blog_posts_published on public.blog_posts(published_at desc)
  where is_published = true and deleted_at is null;
create index if not exists idx_blog_posts_category on public.blog_posts(category);

do $$ begin
  drop trigger if exists set_updated_blog_posts on public.blog_posts;
  create trigger set_updated_blog_posts before update on public.blog_posts
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.blog_posts enable row level security;
do $$ begin
  create policy blog_posts_public_read on public.blog_posts
    for select using (is_published = true and deleted_at is null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy blog_posts_admin on public.blog_posts for all using (
    exists (select 1 from public.members m where m.user_id = auth.uid() and m.role in ('admin','president','secretary','officer'))
  ) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Donation campaigns (DonationThermometer goal-tracking)
-- ---------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  goal_amount numeric(12, 2) not null default 0,
  match_campaign boolean not null default false,
  starts_at date,
  ends_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_active on public.campaigns(is_active);

do $$ begin
  drop trigger if exists set_updated_campaigns on public.campaigns;
  create trigger set_updated_campaigns before update on public.campaigns
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.campaigns enable row level security;
do $$ begin create policy campaigns_public_read on public.campaigns for select using (is_active); exception when duplicate_object then null; end $$;
do $$ begin
  create policy campaigns_admin on public.campaigns for all using (
    exists (select 1 from public.members m where m.user_id = auth.uid() and m.role in ('admin','president','secretary','treasurer','officer'))
  ) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Newsletter subscribers (homepage signup)
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text,
  source text,
  is_active boolean not null default true,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_news_active on public.newsletter_subscribers(is_active);

alter table public.newsletter_subscribers enable row level security;
do $$ begin create policy news_public_insert on public.newsletter_subscribers for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin
  create policy news_admin on public.newsletter_subscribers for all using (
    exists (select 1 from public.members m where m.user_id = auth.uid() and m.role in ('admin','secretary'))
  ) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Photos (admin media gallery + public showcase)
-- ---------------------------------------------------------------------
create table if not exists public.photos (
  id uuid primary key default uuid_generate_v4(),
  url text not null,
  thumb_url text,
  title text,
  caption text,
  alt text,
  category text,
  activity_id uuid references public.activities(id) on delete set null,
  is_featured boolean not null default false,
  display_order int not null default 0,
  taken_on date,
  uploaded_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_photos_featured on public.photos(is_featured) where deleted_at is null;
create index if not exists idx_photos_order on public.photos(display_order, created_at desc) where deleted_at is null;
create index if not exists idx_photos_category on public.photos(category) where deleted_at is null;

do $$ begin
  drop trigger if exists set_updated_photos on public.photos;
  create trigger set_updated_photos before update on public.photos
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.photos enable row level security;
do $$ begin create policy photos_public_read on public.photos for select using (deleted_at is null); exception when duplicate_object then null; end $$;
do $$ begin
  create policy photos_admin on public.photos for all using (
    exists (select 1 from public.members m where m.user_id = auth.uid() and m.role in ('admin','president','secretary','officer'))
  ) with check (true);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Site counters (visitor counter in Footer)
-- ---------------------------------------------------------------------
create table if not exists public.site_counters (
  key text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_counters (key, value) values ('visits', 0) on conflict (key) do nothing;

alter table public.site_counters enable row level security;
do $$ begin create policy sc_public_read on public.site_counters for select using (true); exception when duplicate_object then null; end $$;
do $$ begin
  create policy sc_admin on public.site_counters for all using (
    exists (select 1 from public.members m where m.user_id = auth.uid() and m.role = 'admin')
  ) with check (true);
exception when duplicate_object then null; end $$;
