-- =====================================================================
-- Seed the default Lions federation context so admins can start
-- creating zones / clubs immediately:
--   * Multiple District 323 (India west, default)
--   * District 3232-F1 (Vadodara, the home district of Lions Club of
--     Baroda Rising Star)
-- Both inserts are idempotent — re-running this migration is a no-op
-- when the rows already exist.
-- =====================================================================

insert into public.multiple_districts (code, name, country)
values ('323', 'Multiple District 323', 'India')
on conflict (code) do nothing;

insert into public.districts (multiple_district_id, code, name, lions_year)
select
  md.id,
  '3232-F1',
  'District 3232-F1',
  case
    when extract(month from current_date) >= 7
      then to_char(current_date, 'YYYY') || '-' || to_char(current_date + interval '1 year', 'YY')
    else to_char(current_date - interval '1 year', 'YYYY') || '-' || to_char(current_date, 'YY')
  end
from public.multiple_districts md
where md.code = '323'
on conflict (code) do nothing;
