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
  'District 3232 F1 Vision Mission',
  'Free eye-camps and cataract surgeries across Vadodara — every ₹500 funds one full screening + spectacles.',
  10_00_000,   -- ₹10 lakhs
  true,
  null         -- counts ALL donations until match_campaign is set
)
on conflict (slug) do nothing;
