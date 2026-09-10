-- =====================================================================
-- Dues fee schedule — International per-capita to the LCI standard rate
--
-- Lions Clubs International charges every club a per-member international
-- due of US$50.00 per year, billed in two equal half-yearly instalments
-- (standard rate effective 1 July 2025):
--
--   • 1st half  (01 Jul – 31 Dec) — US$25.00 + 18% GST per active member
--   • 2nd half  (01 Jan – 30 Jun) — US$25.00 + 18% GST per active member
--
-- Migration 0070 encoded the per-capita rate as US$50 on a half-yearly
-- cadence — which bills US$50 twice a year (US$100/yr), i.e. double the
-- LCI standard. Pin the half-yearly rate card to US$25 so each bill
-- cycle charges exactly one instalment, and re-base any unsettled
-- international per-capita invoices already generated at the old US$50
-- basis. Settled invoices (paid / waived / cancelled) are never touched.
-- =====================================================================

-- 1. Rate card — US$25 per active member per half-year (US$50/yr) + 18% GST.
update public.dues_rate_cards
   set amount      = 25,
       currency    = 'USD',
       cadence     = 'half_yearly',
       gst_pct     = 18,
       description = 'Half-yearly per active member — US$25 (US$50/yr) + 18% GST',
       updated_at  = now()
 where code = 'LCI_PER_CAPITA';

-- 2. Re-base unsettled international per-capita invoices from the old
--    US$50 basis to US$25 × active-member count. The INR amount is
--    re-grossed at each invoice's own stored FX rate (× 1.18 GST).
with mc as (
  select club_id, count(*)::numeric as n
    from public.members
   where status = 'active' and deleted_at is null
   group by club_id
)
update public.dues_invoices di
   set amount     = 25 * mc.n,
       currency   = 'USD',
       amount_inr = case
                      when di.fx_rate is not null
                        then round(25 * mc.n * di.fx_rate * 1.18, 2)
                      else di.amount_inr
                    end,
       updated_at = now()
  from mc
 where di.club_id = mc.club_id
   and di.tier = 'international'
   and di.rate_card_id = (select id from public.dues_rate_cards where code = 'LCI_PER_CAPITA')
   and di.status not in ('paid', 'waived', 'cancelled');
