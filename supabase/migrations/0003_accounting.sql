-- =====================================================================
-- Financial ERP — Chart of Accounts, Journals, Vendors, Expenses,
-- Budgets, Audit Log. Double-entry enforced via deferred trigger.
-- Idempotent. Builds on 0001 + 0002.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type account_type as enum ('asset','liability','equity','income','expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_subtype as enum (
    'cash','bank','accounts_receivable','inventory','fixed_asset','other_asset',
    'accounts_payable','accrued_liability','long_term_debt','other_liability',
    'retained_earnings','restricted_funds','unrestricted_funds',
    'donation_income','grant_income','membership_dues','event_income','other_income',
    'program_expense','admin_expense','fundraising_expense','payroll_expense','other_expense'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type journal_status as enum ('draft','posted','voided','reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type expense_status as enum ('draft','submitted','approved','rejected','paid','cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Chart of Accounts
-- ---------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- e.g. 1100 Cash, 4000 Donation Income
  name text not null,
  type account_type not null,
  subtype account_subtype,
  parent_id uuid references public.accounts(id) on delete set null,
  is_restricted boolean not null default false,    -- restricted vs unrestricted funds
  is_active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_accounts_type    on public.accounts(type);
create index if not exists idx_accounts_parent  on public.accounts(parent_id);

-- ---------------------------------------------------------------------
-- Fiscal periods (simple year/month buckets)
-- ---------------------------------------------------------------------
create table if not exists public.fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  is_closed boolean not null default false,
  closed_at timestamptz,
  closed_by uuid references public.members(id) on delete set null
);

create index if not exists idx_fiscal_dates on public.fiscal_periods(start_date, end_date);

-- ---------------------------------------------------------------------
-- Vendors
-- ---------------------------------------------------------------------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  gstin text,
  pan text,
  address text,
  payable_account_id uuid references public.accounts(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendors_name on public.vendors(name);

-- ---------------------------------------------------------------------
-- Journal entries (header) + journal_lines (debits/credits)
-- ---------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_no serial unique,
  entry_date date not null default current_date,
  description text not null,
  reference_type text,            -- 'donation' | 'payment' | 'expense' | 'manual' | 'reversal'
  reference_id uuid,
  status journal_status not null default 'posted',
  reversed_by uuid references public.journal_entries(id) on delete set null,
  fiscal_period_id uuid references public.fiscal_periods(id) on delete set null,
  posted_by uuid references public.members(id) on delete set null,
  total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_journal_date     on public.journal_entries(entry_date);
create index if not exists idx_journal_status   on public.journal_entries(status);
create index if not exists idx_journal_ref      on public.journal_entries(reference_type, reference_id);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  debit  numeric(14,2) not null default 0 check (debit  >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  memo text,
  created_at timestamptz not null default now(),
  check (
    (debit > 0 and credit = 0) or
    (credit > 0 and debit = 0)
  )
);

create index if not exists idx_lines_journal on public.journal_lines(journal_id);
create index if not exists idx_lines_account on public.journal_lines(account_id);

-- ---------------------------------------------------------------------
-- Expenses (with approval workflow)
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_no serial unique,
  vendor_id uuid references public.vendors(id) on delete set null,
  expense_account_id uuid references public.accounts(id),
  amount numeric(14,2) not null check (amount > 0),
  tax_amount numeric(14,2) not null default 0,
  currency text not null default 'INR',
  category text,
  description text,
  expense_date date not null default current_date,
  status expense_status not null default 'draft',
  submitted_by uuid references public.members(id) on delete set null,
  approved_by uuid references public.members(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  bill_url text,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_status on public.expenses(status);
create index if not exists idx_expenses_date   on public.expenses(expense_date);

-- ---------------------------------------------------------------------
-- Budgets
-- ---------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  fiscal_period_id uuid not null references public.fiscal_periods(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  amount numeric(14,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (fiscal_period_id, account_id)
);

-- ---------------------------------------------------------------------
-- Audit log (every write to financial tables)
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id text not null,
  action text not null,                            -- INSERT/UPDATE/DELETE
  before_data jsonb,
  after_data jsonb,
  performed_by uuid,
  performed_at timestamptz not null default now()
);

create index if not exists idx_audit_table on public.audit_log(table_name, row_id);
create index if not exists idx_audit_when  on public.audit_log(performed_at desc);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array[
    'accounts','vendors','journal_entries','expenses'
  ]) loop
    execute format('drop trigger if exists trg_%s_updated on public.%s', t, t);
    execute format('create trigger trg_%s_updated before update on public.%s
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Double-entry balance enforcement
--
-- Runs at COMMIT (deferred) so multi-statement inserts within a single
-- transaction can be balanced collectively. Sum(debit) MUST equal
-- Sum(credit) for any non-draft journal entry.
-- ---------------------------------------------------------------------
create or replace function public.assert_journal_balanced()
returns trigger language plpgsql as $$
declare
  v_debit  numeric(14,2);
  v_credit numeric(14,2);
  v_status journal_status;
begin
  select status into v_status from public.journal_entries
   where id = coalesce(new.journal_id, old.journal_id);

  if v_status is null or v_status = 'draft' then
    return null;
  end if;

  select coalesce(sum(debit),0), coalesce(sum(credit),0)
    into v_debit, v_credit
  from public.journal_lines
  where journal_id = coalesce(new.journal_id, old.journal_id);

  if v_debit <> v_credit then
    raise exception 'Journal % is unbalanced: debit=%, credit=%',
      coalesce(new.journal_id, old.journal_id), v_debit, v_credit;
  end if;

  -- Persist the total back on the header for fast reporting
  update public.journal_entries
     set total_amount = v_debit
   where id = coalesce(new.journal_id, old.journal_id);

  return null;
end $$;

drop trigger if exists trg_journal_balanced on public.journal_lines;
create constraint trigger trg_journal_balanced
  after insert or update or delete on public.journal_lines
  deferrable initially deferred
  for each row execute function public.assert_journal_balanced();

-- ---------------------------------------------------------------------
-- Audit log generic trigger
-- ---------------------------------------------------------------------
create or replace function public.audit_record()
returns trigger language plpgsql as $$
begin
  insert into public.audit_log (table_name, row_id, action, before_data, after_data, performed_by)
  values (
    tg_table_name,
    coalesce(new.id::text, old.id::text),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then row_to_json(old) end,
    case when tg_op in ('UPDATE','INSERT') then row_to_json(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'accounts','journal_entries','journal_lines','expenses','vendors','budgets'
  ]) loop
    execute format('drop trigger if exists trg_%s_audit on public.%s', t, t);
    execute format('create trigger trg_%s_audit
                    after insert or update or delete on public.%s
                    for each row execute function public.audit_record()', t, t);
  end loop;
end $$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.accounts         enable row level security;
alter table public.fiscal_periods   enable row level security;
alter table public.vendors          enable row level security;
alter table public.journal_entries  enable row level security;
alter table public.journal_lines    enable row level security;
alter table public.expenses         enable row level security;
alter table public.budgets          enable row level security;
alter table public.audit_log        enable row level security;

-- accountant role helper
create or replace function public.is_accountant()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid()
      and m.role in ('admin','president','treasurer','secretary')
  );
$$;

-- Wipe + recreate
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname='public' and tablename in (
      'accounts','fiscal_periods','vendors','journal_entries',
      'journal_lines','expenses','budgets','audit_log'
    )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "accounts_read"          on public.accounts         for select using (public.is_accountant() or public.is_admin());
create policy "accounts_admin_write"   on public.accounts         for all    using (public.is_admin()) with check (public.is_admin());
create policy "fiscal_read"            on public.fiscal_periods   for select using (public.is_accountant());
create policy "fiscal_admin_write"     on public.fiscal_periods   for all    using (public.is_admin()) with check (public.is_admin());
create policy "vendors_acc_all"        on public.vendors          for all    using (public.is_accountant()) with check (public.is_accountant());
create policy "journals_acc_read"      on public.journal_entries  for select using (public.is_accountant());
create policy "journals_admin_write"   on public.journal_entries  for all    using (public.is_admin()) with check (public.is_admin());
create policy "lines_acc_read"         on public.journal_lines    for select using (public.is_accountant());
create policy "lines_admin_write"      on public.journal_lines    for all    using (public.is_admin()) with check (public.is_admin());
create policy "expenses_acc_all"       on public.expenses         for all    using (public.is_accountant()) with check (public.is_accountant());
create policy "budgets_acc_all"        on public.budgets          for all    using (public.is_accountant()) with check (public.is_accountant());
create policy "audit_admin_read"       on public.audit_log        for select using (public.is_admin());

-- =====================================================================
-- Reporting views — these power the API in seconds
-- =====================================================================

-- Per-account running balance (signed)
create or replace view public.v_account_balances as
select a.id as account_id,
       a.code, a.name, a.type, a.subtype,
       coalesce(sum(jl.debit  - jl.credit), 0)::numeric(14,2) as net_debit,
       coalesce(sum(case when a.type in ('asset','expense') then jl.debit - jl.credit
                         else jl.credit - jl.debit end), 0)::numeric(14,2) as natural_balance
from public.accounts a
left join public.journal_lines jl on jl.account_id = a.id
left join public.journal_entries je on je.id = jl.journal_id and je.status = 'posted'
group by a.id;

-- Trial balance helper
create or replace view public.v_trial_balance as
select a.code, a.name, a.type,
       sum(jl.debit)  as total_debit,
       sum(jl.credit) as total_credit,
       case when sum(jl.debit) >= sum(jl.credit)
            then sum(jl.debit) - sum(jl.credit) else 0 end as debit_balance,
       case when sum(jl.credit) > sum(jl.debit)
            then sum(jl.credit) - sum(jl.debit) else 0 end as credit_balance
from public.accounts a
left join public.journal_lines jl on jl.account_id = a.id
left join public.journal_entries je on je.id = jl.journal_id and je.status = 'posted'
group by a.id, a.code, a.name, a.type;

-- =====================================================================
-- Seed Chart of Accounts (NGO-standard)
-- =====================================================================
insert into public.accounts (code, name, type, subtype) values
  ('1000', 'Cash on Hand',                'asset',     'cash'),
  ('1100', 'Bank — HDFC Current',         'asset',     'bank'),
  ('1110', 'Bank — Razorpay Settlement',  'asset',     'bank'),
  ('1200', 'Accounts Receivable',         'asset',     'accounts_receivable'),
  ('1500', 'Furniture & Equipment',       'asset',     'fixed_asset'),

  ('2000', 'Accounts Payable',            'liability', 'accounts_payable'),
  ('2100', 'TDS Payable',                 'liability', 'accrued_liability'),
  ('2200', 'GST Payable',                 'liability', 'accrued_liability'),

  ('3000', 'Unrestricted Net Assets',     'equity',    'unrestricted_funds'),
  ('3100', 'Restricted Net Assets',       'equity',    'restricted_funds'),
  ('3900', 'Retained Earnings',           'equity',    'retained_earnings'),

  ('4000', 'Donation Income — General',   'income',    'donation_income'),
  ('4010', 'Donation Income — Restricted','income',    'donation_income'),
  ('4100', 'Membership Dues',             'income',    'membership_dues'),
  ('4200', 'Grant Income',                'income',    'grant_income'),
  ('4300', 'Event Income',                'income',    'event_income'),
  ('4900', 'Other Income',                'income',    'other_income'),

  ('5000', 'Program — Eye Care',          'expense',   'program_expense'),
  ('5010', 'Program — Hunger Relief',     'expense',   'program_expense'),
  ('5020', 'Program — Education',         'expense',   'program_expense'),
  ('5030', 'Program — Health Camps',      'expense',   'program_expense'),
  ('6000', 'Admin — Bank Charges',        'expense',   'admin_expense'),
  ('6010', 'Admin — Office Rent',         'expense',   'admin_expense'),
  ('6020', 'Admin — Utilities',           'expense',   'admin_expense'),
  ('6030', 'Admin — Software & SaaS',     'expense',   'admin_expense'),
  ('6100', 'Fundraising Expenses',        'expense',   'fundraising_expense'),
  ('6200', 'Payroll & Honoraria',         'expense',   'payroll_expense'),
  ('6900', 'Payment Gateway Fees',        'expense',   'admin_expense')
on conflict (code) do nothing;

-- Seed current fiscal year (Apr → Mar India)
insert into public.fiscal_periods (name, start_date, end_date)
select format('FY %s-%s', y, ((y+1)::text)),
       make_date(y, 4, 1),
       make_date(y+1, 3, 31)
from (select extract(year from current_date)::int -
              case when extract(month from current_date)::int < 4 then 1 else 0 end as y) t
on conflict (name) do nothing;
