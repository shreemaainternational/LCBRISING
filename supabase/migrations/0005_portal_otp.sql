-- =====================================================================
-- Customer portal OTP storage.
-- Phones are stored normalised (digits only, last 10) for matching.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.portal_otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone_norm text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_otp_phone on public.portal_otp_codes(phone_norm);
create index if not exists idx_portal_otp_expires on public.portal_otp_codes(expires_at);

alter table public.portal_otp_codes enable row level security;
-- No public policies: only the service-role client touches this table.
