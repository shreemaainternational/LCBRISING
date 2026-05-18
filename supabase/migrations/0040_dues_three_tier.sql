-- =====================================================================
-- Three-tier Dues Management & Reporting Module
--
-- Layered on the existing `dues` table:
--   * Club Dues           — what a club bills its own members
--   * District Dues       — what a district bills its clubs
--   * International Dues  — what LCI bills the club (USD)
--
-- New tables:
--   * dues_rate_cards     — billable line items with cadence + rate
--   * dues_invoices       — generated invoices linked to the right
--                           debtor (member OR club) at the right tier
--   * dues_installments   — partial-payment plans
--   * dues_penalties      — late fees per invoice
--   * dues_payments       — link from dues to payment transactions
--
-- The existing `dues` table is preserved and gains a `tier` column so
-- legacy records still flow through new reporting.
-- =====================================================================

do $$ begin
  create type dues_tier as enum ('club', 'district', 'international');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dues_cadence as enum ('monthly', 'quarterly', 'half_yearly', 'annual', 'one_time');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dues_debtor_kind as enum ('member', 'club');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dues_invoice_status as enum (
    'draft', 'issued', 'partial', 'paid', 'overdue', 'waived', 'cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Rate cards — define what gets billed, how often, and how much.
-- ---------------------------------------------------------------------
create table if not exists public.dues_rate_cards (
  id uuid primary key default uuid_generate_v4(),
  tier dues_tier not null,
  code text not null unique,
  name text not null,
  description text,
  cadence dues_cadence not null default 'annual',
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR',
  late_fee_pct numeric(5,2) default 0,
  grace_days int default 30,
  is_active boolean not null default true,
  applies_to_club_id uuid references public.clubs(id) on delete cascade,
  applies_to_district_id uuid references public.districts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_drc_tier on public.dues_rate_cards(tier, is_active);

-- Seed Lions standard rate cards (idempotent via unique code).
insert into public.dues_rate_cards (tier, code, name, description, cadence, amount, currency, late_fee_pct, grace_days)
values
  ('club',          'CLUB_MONTHLY_DUES',      'Club membership dues',        'Recurring member dues paid to the club', 'monthly',  500,  'INR', 2.00, 15),
  ('club',          'CLUB_JOINING_FEE',       'New-member joining fee',      'One-time induction charge',              'one_time', 1000, 'INR', 0,    0),
  ('club',          'CLUB_ADMIN_FEE',         'Club administration fee',     'Stationery, hall, comms',                'annual',   600,  'INR', 1.00, 30),
  ('club',          'CLUB_EVENT_FEE',         'Event participation fee',     'Per-event ad-hoc',                       'one_time', 200,  'INR', 0,    0),
  ('district',      'DISTRICT_PER_CAPITA',    'District per-capita dues',    'Half-yearly per active member',          'half_yearly', 350, 'INR', 2.50, 30),
  ('district',      'DISTRICT_CONFERENCE',    'District conference fee',     'Per delegate',                           'annual',   1500, 'INR', 0,    0),
  ('district',      'DISTRICT_TRAINING',      'District training fee',       'Cabinet officer / club officer training','one_time', 750,  'INR', 0,    0),
  ('international', 'LCI_PER_CAPITA',         'LCI per-capita dues',         'Half-yearly per active member (USD)',    'half_yearly', 23, 'USD', 0,    60),
  ('international', 'LCI_CHARTER_FEE',        'LCI charter / readmission',   'New club charter or reinstatement',      'one_time', 750,  'USD', 0,    0),
  ('international', 'LCI_LCIF',               'LCIF voluntary contribution', 'Lions Clubs International Foundation',   'one_time', 0,    'USD', 0,    0),
  ('international', 'LCI_MJF',                'Melvin Jones Fellowship',     'MJF / PMJF contribution',                'one_time', 1000, 'USD', 0,    0)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- Invoices — one per (debtor, rate card, period).
-- ---------------------------------------------------------------------
create table if not exists public.dues_invoices (
  id uuid primary key default uuid_generate_v4(),
  tier dues_tier not null,
  rate_card_id uuid references public.dues_rate_cards(id) on delete set null,
  invoice_no text unique,
  debtor_kind dues_debtor_kind not null,
  member_id uuid references public.members(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  district_id uuid references public.districts(id) on delete set null,
  zone_id uuid references public.zones(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  period_label text,                    -- e.g. "Q1 2026", "Jan 2026"
  period_start date,
  period_end date,
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR',
  fx_rate numeric(12,4),                -- for international dues converted to INR
  amount_inr numeric(12,2),
  amount_paid numeric(12,2) not null default 0,
  amount_outstanding numeric(12,2) generated always as (greatest(amount - amount_paid, 0)) stored,
  status dues_invoice_status not null default 'issued',
  paid_at timestamptz,
  waived_reason text,
  notes text,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Sanity: one of member_id / club_id must match the debtor kind.
  constraint chk_member_invoice check (debtor_kind <> 'member' or member_id is not null),
  constraint chk_club_invoice   check (debtor_kind <> 'club'   or club_id   is not null)
);

create index if not exists idx_di_member on public.dues_invoices(member_id);
create index if not exists idx_di_club on public.dues_invoices(club_id);
create index if not exists idx_di_district on public.dues_invoices(district_id);
create index if not exists idx_di_status on public.dues_invoices(status);
create index if not exists idx_di_due on public.dues_invoices(due_date);
create index if not exists idx_di_tier on public.dues_invoices(tier, status);

-- Auto-assign invoice number when missing.
create or replace function public.tg_dues_invoice_no() returns trigger
language plpgsql as $$
begin
  if new.invoice_no is null then
    new.invoice_no := upper(left(new.tier::text, 3)) || '-' || to_char(now(), 'YYYYMM') || '-' || lpad((extract(epoch from now())::bigint % 100000)::text, 5, '0');
  end if;
  return new;
end $$;

do $$ begin
  drop trigger if exists set_dues_invoice_no on public.dues_invoices;
  create trigger set_dues_invoice_no before insert on public.dues_invoices
    for each row execute function public.tg_dues_invoice_no();
  drop trigger if exists set_updated_dues_invoices on public.dues_invoices;
  create trigger set_updated_dues_invoices before update on public.dues_invoices
    for each row execute function public.tg_set_updated_at();
end $$;

-- ---------------------------------------------------------------------
-- Installments — partial payment plans for any invoice.
-- ---------------------------------------------------------------------
create table if not exists public.dues_installments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.dues_invoices(id) on delete cascade,
  seq int not null,
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  paid_at timestamptz,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (invoice_id, seq)
);

create index if not exists idx_di_inst_invoice on public.dues_installments(invoice_id);

-- ---------------------------------------------------------------------
-- Penalties — late fees auto-applied or manual adjustments.
-- ---------------------------------------------------------------------
create table if not exists public.dues_penalties (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.dues_invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  reason text not null default 'late_fee',
  applied_at timestamptz not null default now(),
  applied_by uuid references public.members(id) on delete set null,
  is_waived boolean not null default false
);

create index if not exists idx_di_pen_invoice on public.dues_penalties(invoice_id);

-- ---------------------------------------------------------------------
-- Payment links — many-to-many between invoices and the payments
-- table used for actual money movement.
-- ---------------------------------------------------------------------
create table if not exists public.dues_payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.dues_invoices(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text,
  reference text,
  recorded_by uuid references public.members(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dp_invoice on public.dues_payments(invoice_id);

-- ---------------------------------------------------------------------
-- Extend the legacy `dues` table with a tier column so the existing
-- single-tier records still surface in the new reports.
-- ---------------------------------------------------------------------
alter table public.dues
  add column if not exists tier dues_tier not null default 'club',
  add column if not exists invoice_id uuid references public.dues_invoices(id) on delete set null;

create index if not exists idx_dues_tier on public.dues(tier, status);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.dues_rate_cards    enable row level security;
alter table public.dues_invoices      enable row level security;
alter table public.dues_installments  enable row level security;
alter table public.dues_penalties     enable row level security;
alter table public.dues_payments      enable row level security;

do $$ begin
  create policy drc_read on public.dues_rate_cards for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy drc_admin on public.dues_rate_cards
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy di_admin on public.dues_invoices
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy di_own_member on public.dues_invoices
    for select using (
      member_id in (select id from public.members where user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy di_inst_admin on public.dues_installments
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy di_pen_admin on public.dues_penalties
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy dp_admin on public.dues_payments
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;
