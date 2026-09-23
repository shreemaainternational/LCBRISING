-- =====================================================================
-- Public campaign progress totals.
--
-- /campaigns and <DonationThermometer> need "raised" per campaign, but
-- public.donations is admin-read-only under RLS (it holds donor PII),
-- so anon visitors always saw ₹0. The page also filtered on a
-- donations.campaign_id column that never existed — donations are
-- tagged by the free-text `campaign` column, which the donate flow now
-- fills with the campaign slug.
--
-- This exposes only aggregates (no names/emails/PAN) via a
-- SECURITY DEFINER function. A donation counts when:
--   * its payment was captured, or
--   * it was recorded manually by an admin / CSV import (no payment
--     row at all).
-- Provisional rows from /api/donations/intent whose payment is still
-- 'created', or 'failed' / 'refunded', are excluded.
-- =====================================================================

create or replace function public.campaign_totals()
returns table (campaign text, raised numeric, donors bigint)
language sql
stable
security definer
set search_path = public
as $$
  select d.campaign,
         coalesce(sum(d.amount), 0)::numeric as raised,
         count(*)::bigint as donors
  from public.donations d
  where d.campaign is not null
    and (
      exists (
        select 1 from public.payments p
        where (p.id = d.payment_id or p.donation_id = d.id)
          and p.status = 'captured'
      )
      or (
        d.payment_id is null
        and not exists (select 1 from public.payments p where p.donation_id = d.id)
      )
    )
  group by d.campaign;
$$;

revoke all on function public.campaign_totals() from public;
grant execute on function public.campaign_totals() to anon, authenticated, service_role;

comment on function public.campaign_totals() is
  'Aggregate raised/donor counts per donations.campaign (= campaigns.slug). Counts captured payments and admin-recorded donations only. No PII.';
