-- =====================================================================
-- Correction (reverses 0039):
--   Lions International district code is "3232 F1" (letter F + digit 1),
--   not "3232 FI" (letter I). 0039 had it backwards. This migration
--   rewrites the persisted district code + name everywhere.
--
-- Idempotent — safe to re-apply.
-- =====================================================================

update public.districts
   set code = '3232 F1',
       name = 'District 3232 F1'
 where code in ('3232 FI', '3232-FI', '3232FI');
