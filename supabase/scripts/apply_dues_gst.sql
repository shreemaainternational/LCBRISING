-- =====================================================================
-- LCBRising — apply 18% GST to the dues fee schedule and (re)compute the
-- affected invoices on the production database.
--
-- Fee schedule being encoded (LCI standard, effective 1 July 2025):
--   • District Dues      — ₹350 per active member (half-yearly, no GST)
--   • International Dues — 25 USD per active member per half-year
--                          (50 USD/yr, billed in two instalments),
--                          converted at the USD→INR rate and grossed up
--                          by 18% GST.
--
-- Idempotent + safe to re-run. Settled invoices (paid/waived/cancelled)
-- are never touched. Runs on the server, so member counts are real.
-- =====================================================================

begin;

-- Current Lions half-year period (Jul–Dec 2026 → "H2 2026").
-- Kept as SQL locals via a CTE-free approach: literal constants below.
--   period_label : 'H2 2026'
--   period_start : 2026-07-01
--   period_end   : 2026-12-31
--   due_date     : 2027-01-30
--   fx_rate      : 94.348698   (USD→INR)

-- ---------------------------------------------------------------------
-- 1. Schema: add the GST column (idempotent).
-- ---------------------------------------------------------------------
alter table public.dues_rate_cards
  add column if not exists gst_pct numeric(5,2) not null default 0;

-- ---------------------------------------------------------------------
-- 2. Fee schedule: correct the per-capita rate cards.
-- ---------------------------------------------------------------------
update public.dues_rate_cards
   set amount = 350, currency = 'INR', gst_pct = 0, updated_at = now()
 where code = 'DISTRICT_PER_CAPITA';

update public.dues_rate_cards
   set amount = 25, currency = 'USD', cadence = 'half_yearly', gst_pct = 18,
       description = 'Half-yearly per active member — US$25 (US$50/yr) + 18% GST',
       updated_at = now()
 where code = 'LCI_PER_CAPITA';

-- ---------------------------------------------------------------------
-- 3. UPDATE existing International per-capita invoices (unsettled only):
--    25 USD × active-member-count per half-year,
--    INR = USD × 94.348698 × 1.18.
-- ---------------------------------------------------------------------
with mc as (
  select club_id, count(*)::numeric as n
    from public.members
   where status = 'active' and deleted_at is null
   group by club_id
)
update public.dues_invoices di
   set amount     = 25 * mc.n,
       currency   = 'USD',
       fx_rate    = 94.348698,
       amount_inr = round(25 * mc.n * 94.348698 * 1.18, 2),
       updated_at = now()
  from mc
 where di.club_id = mc.club_id
   and di.tier = 'international'
   and di.rate_card_id = (select id from public.dues_rate_cards where code = 'LCI_PER_CAPITA')
   and di.status not in ('paid', 'waived', 'cancelled');

-- ---------------------------------------------------------------------
-- 4. CREATE District per-capita invoices for the current period where
--    missing: ₹350 × active-member-count per club (no GST).
-- ---------------------------------------------------------------------
insert into public.dues_invoices (
  tier, rate_card_id, debtor_kind, club_id, district_id, zone_id, region_id,
  period_label, period_start, period_end, due_date, amount, currency, status
)
select 'district',
       rc.id,
       'club',
       c.id,
       c.district_id,
       c.zone_id,
       c.region_id,
       'H2 2026',
       date '2026-07-01',
       date '2026-12-31',
       date '2027-01-30',
       350 * mc.n,
       'INR',
       'issued'
  from public.clubs c
  join (
        select club_id, count(*)::numeric as n
          from public.members
         where status = 'active' and deleted_at is null
         group by club_id
       ) mc on mc.club_id = c.id
 cross join (select id from public.dues_rate_cards where code = 'DISTRICT_PER_CAPITA') rc
 where c.deleted_at is null
   and mc.n > 0
   and not exists (
     select 1 from public.dues_invoices x
      where x.club_id = c.id
        and x.rate_card_id = rc.id
        and x.period_label = 'H2 2026'
   );

commit;

-- ---------------------------------------------------------------------
-- Read-back summary (returned by the Management API for verification).
-- ---------------------------------------------------------------------
select tier,
       count(*)                                   as invoices,
       sum(coalesce(amount_inr, amount))          as billed_inr
  from public.dues_invoices
 where tier in ('district', 'international')
 group by tier
 order by tier;
