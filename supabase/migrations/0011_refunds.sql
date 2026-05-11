-- =====================================================================
-- Refunds module
-- Builds on 0003_payment_invoices.sql.
-- Idempotent.
-- =====================================================================

create extension if not exists "pgcrypto";

-- Allow 'refunded' on the existing invoice_status enum.
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'invoice_status' and e.enumlabel = 'refunded'
  ) then
    alter type invoice_status add value 'refunded';
  end if;
end $$;

do $$ begin
  create type refund_status as enum ('requested','processed','failed','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  reason text,
  utr text,
  method text not null default 'manual_upi',
  status refund_status not null default 'requested',
  initiated_by uuid references public.members(id) on delete set null,
  processed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_refunds_payment on public.refunds(payment_id);
create index if not exists idx_refunds_invoice on public.refunds(invoice_id);
create index if not exists idx_refunds_status  on public.refunds(status);

drop trigger if exists trg_refunds_updated_at on public.refunds;
create trigger trg_refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

alter table public.refunds enable row level security;
