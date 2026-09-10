-- =====================================================================
-- Membership (service) anniversaries — derived from members.joined_at.
-- Mirrors public.upcoming_birthdays so the daily automation sweep can
-- greet members on the anniversary of the day they joined.
-- =====================================================================

create or replace view public.upcoming_anniversaries as
select
  id,
  name,
  email,
  phone,
  whatsapp,
  joined_at,
  to_char(joined_at, 'MM-DD') as md,
  extract(year from joined_at)::int as joined_year
from public.members
where joined_at is not null
  and status = 'active'
  and deleted_at is null;
