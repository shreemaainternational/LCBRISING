-- =====================================================================
-- Correction (reverses 0039):
--   Lions International district code is "3232 F1" (letter F + digit 1),
--   not "3232 FI" (letter I). 0039 had it backwards. This migration
--   rewrites the persisted district code + name everywhere.
--
-- Idempotent — safe to re-apply.
-- =====================================================================
--
-- Collision guard: on a from-scratch migration replay the earlier chain
-- leaves TWO district rows at this point —
--   0038 inserts '3232 F1'  →  0039 renames it to '3232 FI'
--   0049 re-inserts a fresh '3232 F1' (on-conflict-do-nothing)
-- so a naïve "rename FI → F1" collides with the existing F1 row on
-- districts_code_key (SQLSTATE 23505). Drop the standalone canonical
-- row(s) first when the legacy variant is present, then rename. The
-- legacy '3232 FI' row is the original district (stable id, carries any
-- FK references), so it is the one we keep and normalize.
delete from public.districts
 where code = '3232 F1'
   and exists (
     select 1 from public.districts v
      where v.code in ('3232 FI', '3232-FI', '3232FI')
   );

update public.districts
   set code = '3232 F1',
       name = 'District 3232 F1'
 where code in ('3232 FI', '3232-FI', '3232FI');
