-- =====================================================================
-- Agent / referrer commission tracking on invoices
-- =====================================================================

create extension if not exists "pgcrypto";

alter table public.invoices
  add column if not exists agent_id uuid references public.members(id) on delete set null;

alter table public.invoices
  add column if not exists commission_rate numeric(5,2);

create index if not exists idx_invoices_agent on public.invoices(agent_id);

do $$ begin
  create type commission_status as enum ('pending','paid','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.commission_records (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  agent_id uuid not null references public.members(id) on delete cascade,
  base_amount numeric(12,2) not null,
  rate numeric(5,2) not null,
  commission_amount numeric(12,2) not null,
  status commission_status not null default 'pending',
  paid_at timestamptz,
  paid_utr text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_commissions_agent on public.commission_records(agent_id);
create index if not exists idx_commissions_status on public.commission_records(status);
create index if not exists idx_commissions_invoice on public.commission_records(invoice_id);

drop trigger if exists trg_commissions_updated_at on public.commission_records;
create trigger trg_commissions_updated_at before update on public.commission_records
  for each row execute function public.set_updated_at();

alter table public.commission_records enable row level security;
