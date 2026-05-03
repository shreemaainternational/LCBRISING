-- =====================================================================
-- Lions Club of Baroda Rising Star — Initial Schema
-- PostgreSQL / Supabase. Includes indexes, FKs and Row Level Security.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type member_role as enum ('admin', 'president', 'secretary', 'treasurer', 'officer', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status as enum ('active', 'lapsed', 'suspended', 'pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dues_status as enum ('pending', 'paid', 'overdue', 'waived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_type as enum ('dues', 'donation', 'event', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rsvp_status as enum ('yes', 'no', 'maybe');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Clubs
-- ---------------------------------------------------------------------
create table if not exists public.clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  district text not null,
  charter_date date,
  city text,
  state text,
  country text default 'India',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clubs_district on public.clubs(district);

-- ---------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null unique,
  club_id uuid references public.clubs(id) on delete set null,
  name text not null,
  email text not null unique,
  phone text,
  role member_role not null default 'member',
  status member_status not null default 'pending',
  joined_at date default current_date,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_members_club on public.members(club_id);
create index if not exists idx_members_status on public.members(status);
create index if not exists idx_members_email on public.members(email);
create index if not exists idx_members_user on public.members(user_id);

-- ---------------------------------------------------------------------
-- Dues
-- ---------------------------------------------------------------------
create table if not exists public.dues (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'INR',
  due_date date not null,
  period_label text,
  status dues_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dues_member on public.dues(member_id);
create index if not exists idx_dues_status on public.dues(status);
create index if not exists idx_dues_due_date on public.dues(due_date);

-- ---------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references public.members(id) on delete set null,
  donation_id uuid,
  dues_id uuid references public.dues(id) on delete set null,
  type payment_type not null,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'INR',
  status payment_status not null default 'created',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  receipt_no text unique,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_member on public.payments(member_id);
create index if not exists idx_payments_dues on public.payments(dues_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_razorpay_order on public.payments(razorpay_order_id);

-- ---------------------------------------------------------------------
-- Activities (service projects)
-- ---------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs(id) on delete set null,
  title text not null,
  description text,
  category text,
  beneficiaries int not null default 0,
  service_hours numeric(10,2) not null default 0,
  amount_raised numeric(10,2) not null default 0,
  date date not null default current_date,
  location text,
  photos text[] default '{}',
  reported_to_district boolean not null default false,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activities_club on public.activities(club_id);
create index if not exists idx_activities_date on public.activities(date);

-- ---------------------------------------------------------------------
-- Donations
-- ---------------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default uuid_generate_v4(),
  donor_name text not null,
  donor_email text,
  donor_phone text,
  donor_pan text,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'INR',
  campaign text,
  message text,
  is_anonymous boolean not null default false,
  payment_id uuid references public.payments(id) on delete set null,
  receipt_no text unique,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_donations_campaign on public.donations(campaign);
create index if not exists idx_donations_created on public.donations(created_at);

do $$ begin
  alter table public.payments
    add constraint fk_payment_donation
    foreign key (donation_id) references public.donations(id) on delete set null
    not valid;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid references public.clubs(id) on delete set null,
  title text not null,
  description text,
  date timestamptz not null,
  end_date timestamptz,
  location text,
  capacity int,
  is_public boolean not null default true,
  cover_url text,
  qr_secret text default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_date on public.events(date);
create index if not exists idx_events_club on public.events(club_id);

-- ---------------------------------------------------------------------
-- Event RSVPs / attendance
-- ---------------------------------------------------------------------
create table if not exists public.event_rsvps (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  guest_name text,
  guest_email text,
  status rsvp_status not null default 'yes',
  attended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, member_id),
  unique (event_id, guest_email)
);

create index if not exists idx_rsvps_event on public.event_rsvps(event_id);

-- ---------------------------------------------------------------------
-- Communications log (email + WhatsApp)
-- ---------------------------------------------------------------------
create table if not exists public.communications (
  id uuid primary key default uuid_generate_v4(),
  channel text not null check (channel in ('email','whatsapp','sms')),
  recipient text not null,
  template text,
  subject text,
  body text,
  status text not null default 'queued',
  provider_id text,
  error text,
  member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_comm_member on public.communications(member_id);
create index if not exists idx_comm_status on public.communications(status);

-- ---------------------------------------------------------------------
-- Automation jobs (lightweight queue)
-- ---------------------------------------------------------------------
create table if not exists public.automation_jobs (
  id uuid primary key default uuid_generate_v4(),
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  run_after timestamptz not null default now(),
  attempts int not null default 0,
  max_attempts int not null default 5,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_run_after on public.automation_jobs(run_after) where status = 'pending';
create index if not exists idx_jobs_status on public.automation_jobs(status);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'clubs','members','dues','payments','activities','events','automation_jobs'
    ])
  loop
    execute format('drop trigger if exists trg_%s_updated on public.%s', t, t);
    execute format('create trigger trg_%s_updated before update on public.%s
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.clubs            enable row level security;
alter table public.members          enable row level security;
alter table public.dues             enable row level security;
alter table public.payments         enable row level security;
alter table public.activities       enable row level security;
alter table public.donations        enable row level security;
alter table public.events           enable row level security;
alter table public.event_rsvps      enable row level security;
alter table public.communications   enable row level security;
alter table public.automation_jobs  enable row level security;

-- Helper: current member row for the authenticated user
create or replace function public.current_member()
returns public.members
language sql stable security definer set search_path = public as $$
  select m.* from public.members m where m.user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid() and m.role in ('admin','president','secretary','treasurer')
  );
$$;

-- Drop any pre-existing policies so the script is fully re-runnable.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('clubs','members','dues','payments','activities',
                        'donations','events','event_rsvps',
                        'communications','automation_jobs')
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Clubs: readable by anyone, writable by admins
create policy "clubs_read"  on public.clubs for select using (true);
create policy "clubs_write" on public.clubs for all   using (public.is_admin()) with check (public.is_admin());

-- Members: a member can read peers in their club; admins can do everything
create policy "members_self_read"   on public.members for select
  using (user_id = auth.uid() or public.is_admin()
         or club_id = (select club_id from public.members where user_id = auth.uid()));
create policy "members_self_update" on public.members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members_admin_all"   on public.members for all
  using (public.is_admin()) with check (public.is_admin());

-- Dues: member sees own dues; admins see all
create policy "dues_self_read"  on public.dues for select
  using (member_id = (select id from public.members where user_id = auth.uid())
         or public.is_admin());
create policy "dues_admin_all"  on public.dues for all
  using (public.is_admin()) with check (public.is_admin());

-- Payments: member sees own payments; admins see all
create policy "payments_self_read" on public.payments for select
  using (member_id = (select id from public.members where user_id = auth.uid())
         or public.is_admin());
create policy "payments_admin_all" on public.payments for all
  using (public.is_admin()) with check (public.is_admin());

-- Activities: public read, admin write
create policy "activities_public_read" on public.activities for select using (true);
create policy "activities_admin_all"   on public.activities for all
  using (public.is_admin()) with check (public.is_admin());

-- Donations: admin read/write only; public inserts go through service role
create policy "donations_admin_read" on public.donations for select using (public.is_admin());
create policy "donations_admin_all"  on public.donations for all
  using (public.is_admin()) with check (public.is_admin());

-- Events: public events are readable by anyone, private only by club members
create policy "events_public_read" on public.events for select
  using (is_public or public.is_admin()
         or club_id = (select club_id from public.members where user_id = auth.uid()));
create policy "events_admin_all"   on public.events for all
  using (public.is_admin()) with check (public.is_admin());

-- RSVPs: a user can RSVP themselves, admins manage all
create policy "rsvps_self_read"  on public.event_rsvps for select
  using (member_id = (select id from public.members where user_id = auth.uid())
         or public.is_admin());
create policy "rsvps_self_write" on public.event_rsvps for insert
  with check (member_id = (select id from public.members where user_id = auth.uid())
              or public.is_admin());
create policy "rsvps_admin_all"  on public.event_rsvps for all
  using (public.is_admin()) with check (public.is_admin());

-- Communications + jobs: admin only via RLS (service role bypasses)
create policy "comm_admin_all" on public.communications for all
  using (public.is_admin()) with check (public.is_admin());
create policy "jobs_admin_all" on public.automation_jobs for all
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Bootstrap: when an auth.user is created, attach a member row
-- =====================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (user_id, name, email, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email, 'pending')
  on conflict (email) do update set user_id = excluded.user_id;

  insert into public.automation_jobs (job_type, payload)
  values ('send_welcome_email', jsonb_build_object('user_id', new.id, 'email', new.email));

  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
