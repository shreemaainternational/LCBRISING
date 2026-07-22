-- =====================================================================
-- Correct the LCI club number for Lions Club of Baroda Rising Star.
--
-- The roster showed #31637 (a stray value shared with another club); the
-- correct charter number is 179323 (District 3232 F1, Region 6, Zone 1 —
-- see scripts/build-activity-report.js). Idempotent — safe to re-apply.
-- =====================================================================

update public.clubs
   set club_number = '179323'
 where name = 'Lions Club of Baroda Rising Star'
   and deleted_at is null;
