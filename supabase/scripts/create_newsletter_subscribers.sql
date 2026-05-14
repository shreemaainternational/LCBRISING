-- =====================================================================
-- Newsletter subscribers — public sign-up table for monthly updates.
-- Idempotent: safe to re-run; new columns are added if missing.
-- =====================================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'home_signup',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  ip_address inet,
  user_agent text
);

-- Richer sign-up fields (name, WhatsApp, preferred channels).
alter table public.newsletter_subscribers
  add column if not exists name text,
  add column if not exists whatsapp text,
  add column if not exists channels text[] not null default array['email']::text[];

create index if not exists idx_newsletter_subscribed_at
  on public.newsletter_subscribers(subscribed_at desc);

alter table public.newsletter_subscribers enable row level security;

-- Anyone can insert (sign up). Reads are admin-only via service role.
do $$ begin
  create policy newsletter_insert on public.newsletter_subscribers
    for insert with check (true);
exception when duplicate_object then null; end $$;
