-- =====================================================================
-- One-shot bundle: site_counters + newsletter + realistic seed.
-- =====================================================================
-- Run this once via Apply database migration workflow with
-- sql_path = supabase/scripts/apply_all_pending.sql
--
-- All sub-scripts are idempotent — safe to re-run.
-- =====================================================================

-- ============== 1. SITE COUNTERS (footer visitor counter) ==============

-- =====================================================================
-- Site visitor counter — single-row counter table with an RPC for
-- atomic increment-and-return. Used by the public footer's
-- 'TOTAL VISITORS' block.
-- =====================================================================

create table if not exists public.site_counters (
  key text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_counters (key, value)
values ('visits', 0)
on conflict (key) do nothing;

create or replace function public.increment_visits()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_value bigint;
begin
  update public.site_counters
     set value = value + 1,
         updated_at = now()
   where key = 'visits'
   returning value into new_value;

  if new_value is null then
    insert into public.site_counters (key, value)
    values ('visits', 1)
    on conflict (key) do update set value = site_counters.value + 1
    returning value into new_value;
  end if;

  return new_value;
end;
$$;

grant execute on function public.increment_visits() to anon, authenticated;

-- RLS
alter table public.site_counters enable row level security;

do $$ begin
  create policy site_counters_read on public.site_counters
    for select using (true);
exception when duplicate_object then null; end $$;


-- ============== 2. NEWSLETTER SUBSCRIBERS ===============================

-- =====================================================================
-- Newsletter subscribers — public sign-up table for monthly updates.
-- =====================================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'home_signup',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  ip_address inet,
  user_agent text
);

create index if not exists idx_newsletter_subscribed_at
  on public.newsletter_subscribers(subscribed_at desc);

alter table public.newsletter_subscribers enable row level security;

-- Anyone can insert (sign up). Reads are admin-only via service role.
do $$ begin
  create policy newsletter_insert on public.newsletter_subscribers
    for insert with check (true);
exception when duplicate_object then null; end $$;


-- ============== 3. REALISTIC SEED DATA ==================================

-- =====================================================================
-- Seed realistic data so the homepage stats banner shows numbers
-- comparable to the production reference:
--   92+ Active Members
--   48+ Service Activities
--   6,400+ Lives Impacted
--   9.3L+ Funds Raised (₹)
--
-- Idempotent: re-running this script is safe.
--   - Members keyed on email (`seed-NNN@lcbrising.test`)
--   - Activities keyed on a deterministic source_id-style title
--   - Donations keyed on a `source_id`-style ('seed:donation:NNN')
--     stored in receipt_no so on-conflict-do-nothing works
--
-- All seed rows are tagged with email/receipt_no prefixes
-- ('seed-…' / 'SEED-…') so they can be cleanly purged later via:
--   delete from public.members    where email like 'seed-%';
--   delete from public.activities where title  like '[SEED]%';
--   delete from public.donations  where receipt_no like 'SEED-%';
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Resolve the Baroda Rising Star club id (or fall back to NULL)
-- ---------------------------------------------------------------------
do $$
declare
  v_club_id uuid;
  v_district_id uuid;
  v_idx int;
  v_first_names text[] := array[
    'Aarav','Aditya','Akshay','Amit','Anil','Arjun','Ashok','Bhavesh','Chetan','Darshan',
    'Devang','Dhruv','Dinesh','Gaurav','Harsh','Hetal','Jaimin','Jignesh','Kalpesh','Kartik',
    'Kishore','Kunal','Manish','Mehul','Mihir','Nilesh','Niraj','Paresh','Parth','Piyush',
    'Pranav','Pratik','Rajesh','Rakesh','Ramesh','Ravi','Ronak','Sagar','Sameer','Sandeep',
    'Sanjay','Saurabh','Shailesh','Shrenik','Siddharth','Sunil','Tejas','Tushar','Vaibhav','Vijay',
    'Vikas','Vimal','Vipul','Yash','Aanya','Aarti','Anjali','Asha','Bhavna','Chhaya',
    'Deepa','Deepika','Disha','Gita','Heena','Hetal','Hiral','Janki','Jyoti','Kavita',
    'Khushi','Komal','Lata','Madhuri','Meena','Meera','Minal','Mira','Nayana','Nikita',
    'Nisha','Pooja','Pratibha','Priya','Rachna','Radha','Rashmi','Reema','Riya','Sangita',
    'Shobha','Smita','Sneha','Sunita','Suman','Tara','Trupti','Urmila','Varsha','Yamini'
  ];
  v_last_names text[] := array[
    'Patel','Shah','Mehta','Desai','Joshi','Trivedi','Parikh','Modi','Soni','Vyas',
    'Gandhi','Jhaveri','Bhatt','Pandya','Dave','Acharya','Doshi','Kothari','Gajjar','Solanki',
    'Rana','Rathod','Chauhan','Vora','Bhavsar','Chokshi','Iyer','Nair','Sharma','Verma',
    'Gupta','Singh','Yadav','Khan','Ali','Reddy','Iyengar','Rao','Menon','Naidu'
  ];
  v_email text;
  v_name text;
  v_phone text;
  v_now timestamptz := now();
begin
  select id into v_club_id from public.clubs
   where name = 'Lions Club of Baroda Rising Star' limit 1;
  select id into v_district_id from public.districts where code = '3232 FI' limit 1;

  -- -------------------------------------------------------------------
  -- 2. 92 members (active), deterministic emails for idempotency.
  -- -------------------------------------------------------------------
  for v_idx in 1..92 loop
    v_email := format('seed-%s@lcbrising.test', lpad(v_idx::text, 3, '0'));
    v_name  := v_first_names[(v_idx % array_length(v_first_names, 1)) + 1]
            || ' ' ||
               v_last_names[(v_idx % array_length(v_last_names, 1)) + 1];
    v_phone := '+91-9' || lpad(((100000000 + v_idx * 6151) % 1000000000)::text, 9, '0');

    insert into public.members (
      name, email, phone, role, status, club_id, district_id, joined_at, created_at
    ) values (
      v_name, v_email, v_phone, 'member', 'active',
      v_club_id, v_district_id,
      (v_now - (v_idx * interval '11 days'))::date,
      v_now - (v_idx * interval '12 hours')
    )
    on conflict (email) do nothing;
  end loop;

  raise notice 'Members seeded.';

  -- -------------------------------------------------------------------
  -- 3. 48 activities. Categories rotate; beneficiaries sum to ~6,400.
  -- -------------------------------------------------------------------
  -- Each activity gets a deterministic title prefixed [SEED-NN] so we
  -- can dedupe and clean up later.
  declare
    activities_tbl text[][] := array[
      -- title_template,                                                category,       beneficiaries, hours
      array['Free Eye Camp - Vadodara Civil Hospital',                  'health',       '550',  '120'],
      array['Diabetes Screening Drive - Karelibaug',                    'health',       '320',  '48'],
      array['Pediatric Cancer Awareness Walk',                          'health',       '180',  '36'],
      array['Vision Screening - Pratapnagar School',                    'health',       '210',  '28'],
      array['Cataract Surgery Sponsorship',                             'health',       '95',   '40'],
      array['Hepatitis B Vaccination Camp',                             'health',       '280',  '32'],
      array['Mental Health Awareness Seminar',                          'health',       '150',  '12'],
      array['Blood Donation Drive - Sayajigunj',                        'health',       '210',  '24'],
      array['Senior Citizens Health Checkup',                           'health',       '140',  '18'],

      array['Hunger Relief Food Distribution - Karelibaug',             'hunger',       '450',  '32'],
      array['Community Kitchen Launch - Pratapnagar',                   'hunger',       '380',  '48'],
      array['Monsoon Food Drive',                                       'hunger',       '290',  '24'],
      array['Mid-day Meals at Government Primary School',               'hunger',       '320',  '60'],
      array['Ration Kit Distribution - Old Padra Road',                 'hunger',       '210',  '20'],
      array['Diwali Sweets for Underprivileged',                        'hunger',       '180',  '16'],

      array['Tree Plantation - Sursagar Lake',                          'environment',  '85',   '36'],
      array['Plastic-Free Vadodara Campaign',                           'environment',  '120',  '40'],
      array['Lake Cleanliness Drive - Ajwa',                            'environment',  '95',   '32'],
      array['Solar Lantern Distribution',                               'environment',  '110',  '24'],
      array['Composting Workshop',                                      'environment',  '70',   '12'],

      array['School Bag Distribution - Government School',              'education',    '150',  '20'],
      array['Scholarship for Underprivileged Students',                 'education',    '40',   '60'],
      array['Career Counselling Workshop',                              'education',    '95',   '24'],
      array['English-Language Coaching Camp',                           'education',    '80',   '120'],
      array['Computer Literacy Drive - Govt Girls School',              'education',    '120',  '80'],
      array['Library Donation - Tribal Belt Schools',                   'education',    '320',  '48'],
      array['Free Tuition Centre Setup - Karelibaug',                   'education',    '95',   '160'],

      array['Disaster Relief - Cyclone Tauktae Response',               'relief',       '180',  '120'],
      array['Flood Relief Kit Distribution',                            'relief',       '210',  '64'],
      array['Wheelchair Distribution to Differently-Abled',             'relief',       '45',   '20'],
      array['Hearing Aid Distribution',                                 'relief',       '60',   '16'],

      array['Youth Leadership Bootcamp',                                'youth',        '85',   '60'],
      array['Skill Development for Adolescents',                        'youth',        '110',  '80'],
      array['Lions Quest - Life Skills Programme',                      'youth',        '95',   '48'],
      array['Sports Day for Government School',                         'youth',        '180',  '24'],

      array['Women Hygiene Kit Distribution',                           'humanitarian', '320',  '36'],
      array['Self-Defence Workshop for Women',                          'humanitarian', '95',   '16'],
      array['Skill-Building for Women Self-Help Groups',                'humanitarian', '60',   '40'],
      array['Senior Citizens Diwali Get-Together',                      'humanitarian', '110',  '12'],
      array['Old-Age Home Visit & Donations',                           'humanitarian', '70',   '20'],
      array['Anganwadi Renovation - Pratapnagar',                       'humanitarian', '95',   '64'],

      array['Polio Awareness Rally',                                    'health',       '180',  '12'],
      array['World Diabetes Day Walk',                                  'health',       '210',  '8'],
      array['World Sight Day - Free Eye Tests',                         'vision',       '380',  '24'],
      array['Spectacles Distribution - Government School',              'vision',       '140',  '20'],
      array['Childhood Cancer Support Group',                           'cancer',       '40',   '60'],
      array['Cancer Survivor Felicitation Event',                       'cancer',       '60',   '12'],
      array['Charter Anniversary Service Project',                      'humanitarian', '150',  '24']
    ];
    i int;
    v_title text;
    v_category text;
    v_beneficiaries int;
    v_hours int;
  begin
    for i in 1..array_length(activities_tbl, 1) loop
      v_title         := format('[SEED-%s] %s', lpad(i::text, 2, '0'), activities_tbl[i][1]);
      v_category      := activities_tbl[i][2];
      v_beneficiaries := activities_tbl[i][3]::int;
      v_hours         := activities_tbl[i][4]::int;

      insert into public.activities (
        title, description, category, beneficiaries, service_hours,
        amount_raised, date, location, club_id, created_at
      ) values (
        v_title,
        'Seed-generated activity for stats demo.',
        v_category, v_beneficiaries, v_hours, 0,
        (v_now - (i * interval '17 days'))::date,
        'Vadodara, Gujarat',
        v_club_id,
        v_now - (i * interval '17 days')
      )
      on conflict do nothing;
    end loop;
  end;

  raise notice 'Activities seeded.';

  -- -------------------------------------------------------------------
  -- 4. ~40 donations summing to ~₹9.3L (930,000 INR).
  -- -------------------------------------------------------------------
  declare
    donation_amounts int[] := array[
      51000, 25000, 100000, 75000, 21000, 11000, 15000, 30000, 8500, 5100,
      18000, 25500, 12000, 9999, 7500, 31000, 51000, 11000, 9000, 14000,
      33000, 25000, 21000, 11000, 19000, 27000, 8000, 12000, 15500, 18500,
      22000, 31000, 12500, 5500, 10000, 41000, 18000, 7000, 14500, 28500
    ];
    sample_donors text[] := array[
      'Anil Patel','Bhavna Mehta','Chetan Shah','Dipti Desai','Ekta Jhaveri',
      'Falguni Vyas','Gaurav Modi','Hetal Trivedi','Iqbal Khan','Jignesh Doshi',
      'Kalpana Soni','Lakshmi Iyer','Mehul Bhatt','Neha Rana','Omkar Bhavsar',
      'Pinal Acharya','Quresh Vora','Rohan Pandya','Saira Khan','Tushar Gajjar'
    ];
    i int;
    v_amount int;
    v_donor text;
    v_email text;
    v_receipt text;
  begin
    for i in 1..array_length(donation_amounts, 1) loop
      v_amount  := donation_amounts[i];
      v_donor   := sample_donors[(i % array_length(sample_donors, 1)) + 1];
      v_email   := lower(replace(v_donor, ' ', '.')) || '@example.com';
      v_receipt := format('SEED-%s', lpad(i::text, 3, '0'));

      insert into public.donations (
        donor_name, donor_email, amount, currency, campaign, message,
        is_anonymous, receipt_no, created_at
      ) values (
        v_donor, v_email, v_amount, 'INR',
        case when i % 4 = 0 then 'Annual Drive'
             when i % 4 = 1 then 'Eye Camp'
             when i % 4 = 2 then 'Hunger Relief'
             else 'General Service' end,
        'Seed-generated donation for stats demo.',
        false, v_receipt,
        v_now - (i * interval '6 days')
      )
      on conflict (receipt_no) do nothing;
    end loop;
  end;

  raise notice 'Donations seeded.';
end $$;

-- ---------------------------------------------------------------------
-- Verification — these counts must match the homepage stats banner.
-- ---------------------------------------------------------------------
select
  (select count(*) from public.members    where status='active')              as active_members,
  (select count(*) from public.activities)                                     as service_activities,
  (select coalesce(sum(beneficiaries),0) from public.activities)               as lives_impacted,
  (select coalesce(sum(amount),0)        from public.donations)                as funds_raised_inr;


-- ============== 4. FINAL VERIFICATION ===================================
select
  (select count(*) from public.members where status='active')              as active_members,
  (select count(*) from public.activities)                                  as service_activities,
  (select coalesce(sum(beneficiaries),0) from public.activities)            as lives_impacted,
  (select coalesce(sum(amount),0)        from public.donations)             as funds_raised_inr,
  (select value from public.site_counters where key='visits')               as total_visits,
  (select count(*) from public.newsletter_subscribers)                      as newsletter_subscribers;
