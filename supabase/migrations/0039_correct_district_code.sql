-- =====================================================================
-- Correction:
--   * District code "3232-F1" / "3232F1" → "3232 FI"  (FI is the letter
--     I, not a digit, with a space separator)
--   * Drop Multiple District 323 entirely — no MD grouping is in use
--
-- Idempotent — safe to re-apply.
-- =====================================================================

-- Rename any historical variants of the seeded district code.
update public.districts
   set code = '3232 FI',
       name = 'District 3232 FI'
 where code in ('3232-F1', '3232F1', '3232 F1', '3232-FI');

-- Unlink any district from MD 323 before removing it.
update public.districts
   set multiple_district_id = null
 where multiple_district_id in (
   select id from public.multiple_districts where code = '323'
 );

-- Hard-delete MD 323 if present.
delete from public.multiple_districts where code = '323';
