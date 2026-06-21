-- =====================================================================
-- Real activity insert — TB Kit Distribution (26 Dec 2024)
-- =====================================================================
-- Source: club activity report (Activity No. 2).
--   Date         : 26/12/2024, 09:30 AM – 11:30 AM
--   Beneficiaries: 620
--   Lions present: 16 volunteers
--   Service hours: 32 (16 × 2)
--   Expenditure  : ₹5,500
--   Venue        : Urban Health Center, Warasiya, Vadodara
--
-- Surfaces in both:
--   • Public website  → home page "Recent Activities" (latest 3 by date)
--   • CRM admin        → /admin/activities (and the activity detail page)
-- since both read public.activities.
--
-- Idempotent: re-running is safe (guarded on title + date). Run via the
-- "Apply database migration" workflow with
--   sql_path = supabase/scripts/add_tb_kit_distribution.sql
-- =====================================================================

do $$
declare
  v_club_id uuid;
begin
  -- Attach to the home club when present; otherwise leave NULL.
  select id into v_club_id
    from public.clubs
   where name = 'Lions Club of Baroda Rising Star'
   limit 1;

  insert into public.activities (
    club_id,
    title,
    description,
    category,
    beneficiaries,
    service_hours,
    volunteer_hours_total,
    lion_members_count,
    amount_raised,
    budget,
    expenses,
    date,
    location,
    is_medical_camp,
    status,
    reported_to_district
  )
  select
    v_club_id,
    'TB Kit Distribution',
    'Distribution of TB nutrition support kits to patients at the Urban Health '
      || 'Center, Warasiya, Vadodara. Held 09:30 AM – 11:30 AM with 16 Lions '
      || 'volunteers contributing 32 service hours (16 × 2). 620 beneficiaries '
      || 'reached. Expenditure ₹5,500.',
    'healthcare',
    620,
    32,
    32,
    16,
    0,
    5500,
    5500,
    date '2024-12-26',
    'Urban Health Center, Warasiya, Vadodara',
    true,
    'completed',
    false
  where not exists (
    select 1 from public.activities
     where title = 'TB Kit Distribution'
       and date  = date '2024-12-26'
  );
end $$;
