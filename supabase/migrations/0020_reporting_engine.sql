-- =====================================================================
-- Lions Club of Baroda Rising Star — Reporting & Analytics Engine
--   * reports archive (generated artifacts: PDF + PPTX)
--   * report_schedules (cron-driven auto-generation)
--   * beneficiaries (first-class beneficiary CRM)
--   * csr_partners (CSR donor org master)
--   * sdg_goals lookup + activity_sdgs mapping
--   * service_categories (Lions service framework)
--   * volunteer_logs (lion-hours ledger)
--   * award_qualifications (MJF/PMJF/club excellence tracking)
--   * media_camp_records (medical/blood camps detail)
--   * Activities extended with service category, SDG, CSR partner,
--     lion/leo counts, GPS, before/after media
-- Idempotent.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type report_type as enum (
    'monthly', 'quarterly', 'half_yearly', 'yearly',
    'activity', 'csr', 'donor', 'district', 'multi_district',
    'lions_international', 'beneficiary', 'financial',
    'volunteer', 'sdg_impact', 'event_performance',
    'medical_camp', 'service_category', 'award_qualification',
    'club_growth', 'membership'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_format as enum ('pdf', 'pptx', 'csv', 'json', 'html');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('queued', 'generating', 'ready', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type schedule_frequency as enum (
    'daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type beneficiary_gender as enum ('male', 'female', 'other', 'undisclosed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type award_tier as enum (
    'mjf', 'pmjf', 'club_excellence', 'presidential', 'governor_appreciation',
    'leadership', 'service', 'membership_growth', 'centennial'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Service Categories — Lions International service framework
-- ---------------------------------------------------------------------
create table if not exists public.service_categories (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  color text,
  display_order int default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.service_categories (code, name, description, color, display_order)
values
  ('vision',       'Vision',                'Eye camps, cataract surgeries, spectacle distribution',  '#2563eb', 1),
  ('hunger',       'Hunger Relief',         'Food drives, ration kits, community kitchens',           '#dc2626', 2),
  ('environment',  'Environment',           'Tree plantation, clean-up drives, sustainability',       '#16a34a', 3),
  ('diabetes',     'Diabetes Awareness',    'Screening camps, awareness, prevention programs',        '#7c3aed', 4),
  ('childhood_cancer','Childhood Cancer',   'Pediatric oncology support, awareness, treatment aid',   '#db2777', 5),
  ('humanitarian', 'Humanitarian',          'Disaster relief, community welfare, emergency aid',      '#ea580c', 6),
  ('youth',        'Youth Development',     'Leo clubs, scholarships, leadership programs',           '#0891b2', 7),
  ('education',    'Education',             'Schools, libraries, scholarships, digital literacy',     '#0284c7', 8),
  ('healthcare',   'Healthcare',            'Medical camps, blood donation, health screenings',       '#be123c', 9),
  ('women',        'Women Empowerment',     'Skill development, awareness, empowerment programs',     '#c026d3', 10),
  ('senior',       'Senior Citizens',       'Elderly care, old-age home visits, wellness',            '#65a30d', 11),
  ('other',        'Other Service',         'Miscellaneous service projects',                         '#64748b', 99)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- SDG goals (UN Sustainable Development Goals)
-- ---------------------------------------------------------------------
create table if not exists public.sdg_goals (
  id int primary key,
  code text not null unique,
  name text not null,
  color text,
  icon_url text,
  created_at timestamptz not null default now()
);

insert into public.sdg_goals (id, code, name, color) values
  (1,  'SDG1',  'No Poverty',                              '#E5243B'),
  (2,  'SDG2',  'Zero Hunger',                             '#DDA63A'),
  (3,  'SDG3',  'Good Health and Well-being',              '#4C9F38'),
  (4,  'SDG4',  'Quality Education',                       '#C5192D'),
  (5,  'SDG5',  'Gender Equality',                         '#FF3A21'),
  (6,  'SDG6',  'Clean Water and Sanitation',              '#26BDE2'),
  (7,  'SDG7',  'Affordable and Clean Energy',             '#FCC30B'),
  (8,  'SDG8',  'Decent Work and Economic Growth',         '#A21942'),
  (9,  'SDG9',  'Industry, Innovation and Infrastructure', '#FD6925'),
  (10, 'SDG10', 'Reduced Inequalities',                    '#DD1367'),
  (11, 'SDG11', 'Sustainable Cities and Communities',      '#FD9D24'),
  (12, 'SDG12', 'Responsible Consumption and Production',  '#BF8B2E'),
  (13, 'SDG13', 'Climate Action',                          '#3F7E44'),
  (14, 'SDG14', 'Life Below Water',                        '#0A97D9'),
  (15, 'SDG15', 'Life on Land',                            '#56C02B'),
  (16, 'SDG16', 'Peace, Justice and Strong Institutions',  '#00689D'),
  (17, 'SDG17', 'Partnerships for the Goals',              '#19486A')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- CSR partners
-- ---------------------------------------------------------------------
create table if not exists public.csr_partners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  legal_name text,
  pan text,
  gstin text,
  cin text,
  contact_person text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  state text,
  partnership_started_on date,
  total_contributed numeric(14,2) not null default 0,
  logo_url text,
  website text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_csr_active on public.csr_partners(is_active);

-- ---------------------------------------------------------------------
-- Beneficiaries — first-class CRM record
-- ---------------------------------------------------------------------
create table if not exists public.beneficiaries (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text,
  email text,
  gender beneficiary_gender,
  age int,
  date_of_birth date,
  aadhaar_last4 text,
  income_category text,
  household_size int,
  address text,
  city text,
  state text,
  pincode text,
  lat numeric(9,6),
  lng numeric(9,6),
  photo_url text,
  first_service_date date,
  last_service_date date,
  total_services_received int not null default 0,
  total_value_received numeric(12,2) not null default 0,
  family_head text,
  emergency_contact text,
  notes text,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_beneficiaries_phone on public.beneficiaries(phone);
create index if not exists idx_beneficiaries_city on public.beneficiaries(city);
create index if not exists idx_beneficiaries_last_service on public.beneficiaries(last_service_date desc);

-- ---------------------------------------------------------------------
-- Extend activities with reporting columns
-- ---------------------------------------------------------------------
alter table public.activities
  add column if not exists service_category_id uuid references public.service_categories(id) on delete set null,
  add column if not exists csr_partner_id uuid references public.csr_partners(id) on delete set null,
  add column if not exists event_id uuid references public.events(id) on delete set null,
  add column if not exists lion_members_count int not null default 0,
  add column if not exists leo_members_count int not null default 0,
  add column if not exists guest_count int not null default 0,
  add column if not exists volunteer_hours_total numeric(10,2) not null default 0,
  add column if not exists budget numeric(12,2) not null default 0,
  add column if not exists expenses numeric(12,2) not null default 0,
  add column if not exists sponsorship_amount numeric(12,2) not null default 0,
  add column if not exists sdg_codes text[] not null default '{}',
  add column if not exists gps_lat numeric(9,6),
  add column if not exists gps_lng numeric(9,6),
  add column if not exists before_photos text[] not null default '{}',
  add column if not exists after_photos text[] not null default '{}',
  add column if not exists videos text[] not null default '{}',
  add column if not exists documents text[] not null default '{}',
  add column if not exists doctor_details jsonb,
  add column if not exists is_medical_camp boolean not null default false,
  add column if not exists is_blood_donation boolean not null default false,
  add column if not exists units_collected int,
  add column if not exists media_coverage text[] not null default '{}',
  add column if not exists impact_score int,
  add column if not exists status text not null default 'completed';

create index if not exists idx_activities_service_cat on public.activities(service_category_id);
create index if not exists idx_activities_csr on public.activities(csr_partner_id);
create index if not exists idx_activities_sdg on public.activities using gin(sdg_codes);

-- ---------------------------------------------------------------------
-- Beneficiary <-> activity service log
-- ---------------------------------------------------------------------
create table if not exists public.beneficiary_services (
  id uuid primary key default uuid_generate_v4(),
  beneficiary_id uuid not null references public.beneficiaries(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  service_date date not null default current_date,
  service_type text,
  description text,
  value_provided numeric(12,2) not null default 0,
  follow_up_required boolean not null default false,
  follow_up_date date,
  follow_up_status text,
  medical_report_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_benesvc_beneficiary on public.beneficiary_services(beneficiary_id);
create index if not exists idx_benesvc_activity on public.beneficiary_services(activity_id);
create index if not exists idx_benesvc_date on public.beneficiary_services(service_date);

-- ---------------------------------------------------------------------
-- Volunteer logs — lion-hours ledger
-- ---------------------------------------------------------------------
create table if not exists public.volunteer_logs (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.members(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  hours numeric(6,2) not null check (hours >= 0),
  role text,
  notes text,
  logged_for_date date not null default current_date,
  verified_by uuid references public.members(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vlog_member on public.volunteer_logs(member_id);
create index if not exists idx_vlog_activity on public.volunteer_logs(activity_id);
create index if not exists idx_vlog_date on public.volunteer_logs(logged_for_date desc);

-- ---------------------------------------------------------------------
-- Award qualifications
-- ---------------------------------------------------------------------
create table if not exists public.award_qualifications (
  id uuid primary key default uuid_generate_v4(),
  tier award_tier not null,
  award_name text not null,
  member_id uuid references public.members(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  district_id uuid references public.districts(id) on delete set null,
  lions_year text,
  criteria_met jsonb,
  qualifying_score numeric(8,2),
  status text not null default 'pending',
  awarded_on date,
  certificate_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_award_member on public.award_qualifications(member_id);
create index if not exists idx_award_club on public.award_qualifications(club_id);
create index if not exists idx_award_year on public.award_qualifications(lions_year);

-- ---------------------------------------------------------------------
-- Reports archive
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  type report_type not null,
  title text not null,
  period_start date,
  period_end date,
  lions_year text,
  format report_format not null default 'pdf',
  status report_status not null default 'ready',
  filters jsonb not null default '{}',
  summary jsonb not null default '{}',
  totals jsonb not null default '{}',
  ai_narrative text,
  storage_path text,
  download_url text,
  size_bytes bigint,
  page_count int,
  generated_by uuid references public.members(id) on delete set null,
  club_id uuid references public.clubs(id) on delete set null,
  district_id uuid references public.districts(id) on delete set null,
  multiple_district_id uuid references public.multiple_districts(id) on delete set null,
  schedule_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_type on public.reports(type);
create index if not exists idx_reports_period on public.reports(period_start, period_end);
create index if not exists idx_reports_year on public.reports(lions_year);
create index if not exists idx_reports_created on public.reports(created_at desc);

-- ---------------------------------------------------------------------
-- Report schedules
-- ---------------------------------------------------------------------
create table if not exists public.report_schedules (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type report_type not null,
  format report_format not null default 'pdf',
  frequency schedule_frequency not null,
  filters jsonb not null default '{}',
  recipients text[] not null default '{}',
  whatsapp_recipients text[] not null default '{}',
  is_active boolean not null default true,
  last_run_at timestamptz,
  last_status report_status,
  next_run_at timestamptz,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rschedule_active on public.report_schedules(is_active);
create index if not exists idx_rschedule_next on public.report_schedules(next_run_at);

do $$ begin
  alter table public.reports
    add constraint fk_report_schedule
    foreign key (schedule_id) references public.report_schedules(id) on delete set null
    not valid;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Medical camp records (detail attached to an activity)
-- ---------------------------------------------------------------------
create table if not exists public.medical_camp_records (
  id uuid primary key default uuid_generate_v4(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  patients_screened int not null default 0,
  consultations int not null default 0,
  surgeries int not null default 0,
  spectacles_distributed int not null default 0,
  medicines_distributed_value numeric(12,2) not null default 0,
  blood_units_collected int not null default 0,
  referrals int not null default 0,
  follow_ups_scheduled int not null default 0,
  doctors jsonb not null default '[]',
  specialties text[] not null default '{}',
  partner_hospitals text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mcr_activity on public.medical_camp_records(activity_id);

-- ---------------------------------------------------------------------
-- updated_at triggers (idempotent re-apply via DROP/CREATE)
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ begin
  drop trigger if exists set_updated_reports on public.reports;
  create trigger set_updated_reports before update on public.reports
    for each row execute function public.tg_set_updated_at();
  drop trigger if exists set_updated_rschedule on public.report_schedules;
  create trigger set_updated_rschedule before update on public.report_schedules
    for each row execute function public.tg_set_updated_at();
  drop trigger if exists set_updated_csr on public.csr_partners;
  create trigger set_updated_csr before update on public.csr_partners
    for each row execute function public.tg_set_updated_at();
  drop trigger if exists set_updated_beneficiaries on public.beneficiaries;
  create trigger set_updated_beneficiaries before update on public.beneficiaries
    for each row execute function public.tg_set_updated_at();
  drop trigger if exists set_updated_awards on public.award_qualifications;
  create trigger set_updated_awards before update on public.award_qualifications
    for each row execute function public.tg_set_updated_at();
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.reports             enable row level security;
alter table public.report_schedules    enable row level security;
alter table public.beneficiaries       enable row level security;
alter table public.beneficiary_services enable row level security;
alter table public.csr_partners        enable row level security;
alter table public.volunteer_logs      enable row level security;
alter table public.award_qualifications enable row level security;
alter table public.medical_camp_records enable row level security;
alter table public.service_categories  enable row level security;
alter table public.sdg_goals           enable row level security;

do $$ begin
  create policy reports_admin_all on public.reports
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy rschedule_admin_all on public.report_schedules
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy beneficiaries_admin_all on public.beneficiaries
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy benesvc_admin_all on public.beneficiary_services
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy csr_admin_all on public.csr_partners
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy vlog_admin_all on public.volunteer_logs
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy awards_admin_all on public.award_qualifications
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy mcr_admin_all on public.medical_camp_records
    for all using (
      exists (select 1 from public.members m
              where m.user_id = auth.uid()
                and m.role in ('admin','president','secretary','treasurer','officer'))
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy svc_cat_read_all on public.service_categories for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy sdg_read_all on public.sdg_goals for select using (true);
exception when duplicate_object then null; end $$;

-- =====================================================================
-- End 0020_reporting_engine.sql
-- =====================================================================
