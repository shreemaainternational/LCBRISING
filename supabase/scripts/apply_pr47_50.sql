-- =====================================================================
-- Bundle for PRs #47-50: photos + campaigns activation.
-- (newsletter_subscribers + site_counters + realistic seed were
--  bundled previously in apply_all_pending.sql.)
-- =====================================================================

-- ============== PHOTOS (media library CMS) ==============================

-- =====================================================================
-- Photos table — curated images managed via /admin/media.
-- Drives the public Media gallery and the About-section collage.
-- =====================================================================

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  thumb_url text,
  title text,
  caption text,
  category text,                 -- 'gallery', 'about', 'hero', 'press', ...
  alt text,
  width int,
  height int,
  uploaded_by uuid references public.members(id) on delete set null,
  is_featured boolean not null default false,
  display_order int default 0,
  taken_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_photos_category on public.photos(category);
create index if not exists idx_photos_featured on public.photos(is_featured) where is_featured;
create index if not exists idx_photos_order on public.photos(display_order);

drop trigger if exists trg_photos_updated on public.photos;
create trigger trg_photos_updated before update on public.photos
  for each row execute function public.set_updated_at();

alter table public.photos enable row level security;

-- Public can read non-deleted photos.
do $$ begin
  create policy photos_read on public.photos
    for select using (deleted_at is null);
exception when duplicate_object then null; end $$;

-- Writes via service role only (admin upload flow).

-- ============== CAMPAIGNS (donation thermometer) =======================

-- =====================================================================
-- Donation campaigns — named fundraising goals shown on /donate
-- and the homepage as live progress thermometers.
-- =====================================================================

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  goal_amount numeric(12,2) not null check (goal_amount > 0),
  currency text not null default 'INR',
  starts_at timestamptz default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  is_featured boolean not null default false,   -- shown on homepage when true
  match_campaign text,                           -- existing donation.campaign value to count toward this goal
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_active on public.campaigns(is_active) where is_active;
create index if not exists idx_campaigns_featured on public.campaigns(is_featured) where is_featured;

drop trigger if exists trg_campaigns_updated on public.campaigns;
create trigger trg_campaigns_updated before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

do $$ begin
  create policy campaigns_read on public.campaigns
    for select using (is_active);
exception when duplicate_object then null; end $$;

-- Seed a featured campaign so the thermometer has something to show.
insert into public.campaigns (slug, title, description, goal_amount, is_featured, match_campaign)
values (
  'vision-mission-2026',
  'District 3232 FI Vision Mission',
  'Free eye-camps and cataract surgeries across Vadodara — every ₹500 funds one full screening + spectacles.',
  10_00_000,   -- ₹10 lakhs
  true,
  null         -- counts ALL donations until match_campaign is set
)
on conflict (slug) do nothing;

-- ============== VERIFY =================================================
select
  (select count(*) from public.photos)                  as photos,
  (select count(*) from public.campaigns)               as campaigns,
  (select count(*) from public.campaigns where is_active and is_featured) as featured_active;
