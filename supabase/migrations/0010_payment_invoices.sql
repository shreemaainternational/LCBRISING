-- =====================================================================
-- Payment Invoices + PhonePe / UPI Collection Module
-- Builds on 0001_initial_schema.sql (uses existing payments + members).
-- Idempotent.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type invoice_status as enum ('draft','sent','paid','partial','cancelled','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proof_method as enum ('screenshot','utr','phonepe_webhook','razorpay','manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proof_status as enum ('pending','verified','rejected','duplicate');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'INR',
  gst_rate numeric(5,2),
  gst_amount numeric(12,2),
  description text,
  status invoice_status not null default 'sent',
  due_date date,
  expires_at timestamptz,
  member_id uuid references public.members(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_invoices_status   on public.invoices(status);
create index if not exists idx_invoices_due_date on public.invoices(due_date);
create index if not exists idx_invoices_phone    on public.invoices(customer_phone);
create index if not exists idx_invoices_member   on public.invoices(member_id);
create index if not exists idx_invoices_no       on public.invoices(invoice_no);

-- ---------------------------------------------------------------------
-- Extend payments to link to invoices (uses existing payments table).
-- ---------------------------------------------------------------------
alter table public.payments
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

alter table public.payments
  add column if not exists utr text;

alter table public.payments
  add column if not exists upi_vpa text;

alter table public.payments
  add column if not exists method proof_method;

create index if not exists idx_payments_invoice on public.payments(invoice_id);
create unique index if not exists uq_payments_utr on public.payments(utr) where utr is not null;

-- Allow 'invoice' as a valid payment_type. payment_type was created in 0001.
-- Adding a new enum value is safe and idempotent-by-existence-check.
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'payment_type' and e.enumlabel = 'invoice'
  ) then
    alter type payment_type add value 'invoice';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Payment proofs (screenshots, UTR submissions)
-- ---------------------------------------------------------------------
create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  method proof_method not null,
  utr text,
  upi_vpa text,
  amount_claimed numeric(12,2),
  screenshot_url text,
  screenshot_hash text,
  notes text,
  status proof_status not null default 'pending',
  reviewed_by uuid references public.members(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  submitted_ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_proofs_invoice on public.payment_proofs(invoice_id);
create index if not exists idx_proofs_status  on public.payment_proofs(status);
create index if not exists idx_proofs_utr     on public.payment_proofs(utr);
create unique index if not exists uq_proofs_hash on public.payment_proofs(screenshot_hash)
  where screenshot_hash is not null;

-- ---------------------------------------------------------------------
-- QR codes (static + dynamic, per-invoice)
-- ---------------------------------------------------------------------
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  label text,
  upi_string text not null,
  amount numeric(12,2),
  is_static boolean not null default false,
  expires_at timestamptz,
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_qr_invoice on public.qr_codes(invoice_id);

-- ---------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------
create table if not exists public.payment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  actor_id uuid references public.members(id) on delete set null,
  actor_kind text not null default 'system',
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_invoice on public.payment_audit_logs(invoice_id);
create index if not exists idx_audit_action  on public.payment_audit_logs(action);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.invoices        enable row level security;
alter table public.payment_proofs  enable row level security;
alter table public.qr_codes        enable row level security;
alter table public.payment_audit_logs enable row level security;

-- Public can READ a specific invoice (needed for /pay/[id] page).
-- They cannot list / enumerate because there is no list endpoint exposing this.
drop policy if exists invoices_public_read on public.invoices;
create policy invoices_public_read on public.invoices
  for select using (deleted_at is null);

-- Anyone with the invoice id can submit a proof. Server validates the rest.
drop policy if exists proofs_public_insert on public.payment_proofs;
create policy proofs_public_insert on public.payment_proofs
  for insert with check (true);

drop policy if exists qr_public_read on public.qr_codes;
create policy qr_public_read on public.qr_codes for select using (true);

-- Admins (members with role in admin set) can do everything via service-role.
-- App reads admin data only with createAdminClient(), which bypasses RLS.

-- ---------------------------------------------------------------------
-- Storage bucket for payment screenshots
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;
