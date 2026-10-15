-- =====================================================================
-- audit_activity_descriptions.sql  (READ-ONLY — changes nothing)
-- Lists every activity whose description is missing or very short, with
-- the facts needed to write one. Run via:
--   Actions -> "Apply database migration (one-shot)"
--   -> sql_path = supabase/scripts/audit_activity_descriptions.sql
-- The result appears in the workflow log.
-- =====================================================================

select
  a.id,
  a.title,
  a.date,
  a.category,
  a.location,
  a.beneficiaries,
  a.lion_members_count,
  a.service_hours,
  a.amount_raised,
  coalesce(length(btrim(a.description)), 0) as description_length,
  left(a.description, 120)                  as description_start
from public.activities a
where a.description is null
   or length(btrim(a.description)) < 60
order by a.date;
