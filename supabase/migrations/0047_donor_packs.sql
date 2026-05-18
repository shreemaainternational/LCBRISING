-- =====================================================================
-- Annual 80G consolidated donor pack — one PDF per donor per fiscal year
-- (Apr 1 – Mar 31 in India), auto-emailed on the first Sunday of April
-- via /api/cron/donor-pack. Each (donor_email, fiscal_year_start) is
-- generated at most once unless force-regenerated.
-- =====================================================================

create table if not exists public.donor_tax_packs (
  id uuid primary key default uuid_generate_v4(),
  donor_email text not null,
  donor_name text,
  donor_pan text,
  fiscal_year_start date not null,
  fiscal_year_end date not null,
  total_amount numeric(12, 2) not null default 0,
  donation_count int not null default 0,
  pdf_url text,
  generated_at timestamptz not null default now(),
  emailed_at timestamptz,
  emailed_to text,
  email_status text default 'pending',
  email_error text,
  created_at timestamptz not null default now(),
  unique (donor_email, fiscal_year_start)
);

create index if not exists idx_donor_tax_packs_fy on public.donor_tax_packs(fiscal_year_start);
create index if not exists idx_donor_tax_packs_email on public.donor_tax_packs(donor_email);
create index if not exists idx_donor_tax_packs_status on public.donor_tax_packs(email_status);

alter table public.donor_tax_packs enable row level security;

do $$ begin
  create policy donor_tax_packs_admin on public.donor_tax_packs
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid() and m.role = 'admin')
    ) with check (true);
exception when duplicate_object then null; end $$;
