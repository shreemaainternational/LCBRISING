-- =====================================================================
-- Dues fee schedule — GST support + corrected per-capita rates
--
-- The three-tier dues module (migration 0040) seeded the standard Lions
-- rate cards but predates two facts of the current fee schedule:
--
--   • District Dues       — ₹350 per active member (half-yearly)
--   • International Dues  — 50 USD per active member, converted to INR
--                            at the prevailing USD→INR rate and then
--                            grossed up by 18% GST.
--
-- District already sits at ₹350 so no amount change is needed there.
-- The international per-capita rate moves 23 USD → 50 USD, and every
-- rate card gains a `gst_pct` column so the bill-cycle engine can gross
-- up the INR amount. Only the international tier carries 18% GST today;
-- all other cards default to 0 and are unaffected.
-- =====================================================================

-- 1. Add the GST column (idempotent).
alter table public.dues_rate_cards
  add column if not exists gst_pct numeric(5,2) not null default 0;

-- 2. Correct the fee schedule.
--    District per-capita — pin to ₹350 per member (already the seeded
--    value, set explicitly so the schedule is self-documenting).
update public.dues_rate_cards
   set amount = 350, currency = 'INR', gst_pct = 0, updated_at = now()
 where code = 'DISTRICT_PER_CAPITA';

--    International per-capita — 50 USD per member + 18% GST.
update public.dues_rate_cards
   set amount = 50, currency = 'USD', gst_pct = 18, updated_at = now()
 where code = 'LCI_PER_CAPITA';
