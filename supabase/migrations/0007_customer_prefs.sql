-- =====================================================================
-- Customer notification preferences (per phone)
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.customer_preferences (
  phone_norm text primary key,
  whatsapp_enabled boolean not null default true,
  email_enabled boolean not null default true,
  reminders_enabled boolean not null default true,
  language text not null default 'en',
  updated_at timestamptz not null default now()
);

alter table public.customer_preferences enable row level security;
