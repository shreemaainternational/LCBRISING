-- =====================================================================
-- Seed the default Lions district on a fresh install so admins can
-- start creating zones / clubs immediately.
--
-- District 3232 FI (Vadodara, the home district of Lions Club of
-- Baroda Rising Star). No Multiple-District grouping is created —
-- the MD link is left NULL by design.
--
-- Idempotent: ON CONFLICT (code) DO NOTHING.
-- =====================================================================

insert into public.districts (multiple_district_id, code, name, lions_year)
values (
  null,
  '3232 FI',
  'District 3232 FI',
  case
    when extract(month from current_date) >= 7
      then to_char(current_date, 'YYYY') || '-' || to_char(current_date + interval '1 year', 'YY')
    else to_char(current_date - interval '1 year', 'YYYY') || '-' || to_char(current_date, 'YY')
  end
)
on conflict (code) do nothing;
