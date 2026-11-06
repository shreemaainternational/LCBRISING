-- =====================================================================
-- Manage Officers — mirror the Lions portal officer flow.
--
--   * officer_type      — 'officer' | 'chairperson' (the portal's
--                          "Officer Type" dropdown).
--   * is_district_cabinet — the officer is also a member of the district
--                          cabinet (each club designates a cabinet member).
--   * address / contact  — for the portal's "Add Officer Address" action.
--
-- All additive & idempotent.
-- =====================================================================

alter table public.officers
  add column if not exists officer_type text
    check (officer_type is null or officer_type in ('officer', 'chairperson')),
  add column if not exists is_district_cabinet boolean not null default false,
  add column if not exists address text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text;

create index if not exists idx_officers_cabinet
  on public.officers(is_district_cabinet) where is_district_cabinet;
