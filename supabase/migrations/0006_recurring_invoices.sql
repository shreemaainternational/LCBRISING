-- =====================================================================
-- Recurring invoice templates
-- =====================================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type recurrence_interval as enum ('weekly','monthly','quarterly','yearly');
exception when duplicate_object then null; end $$;

create table if not exists public.recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  interval recurrence_interval not null,
  next_run_at date not null,
  end_at date,
  active boolean not null default true,
  send_whatsapp boolean not null default true,
  send_email boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_active   on public.recurring_invoices(active);
create index if not exists idx_recurring_next_run on public.recurring_invoices(next_run_at);

drop trigger if exists trg_recurring_updated_at on public.recurring_invoices;
create trigger trg_recurring_updated_at before update on public.recurring_invoices
  for each row execute function public.set_updated_at();

alter table public.recurring_invoices enable row level security;
