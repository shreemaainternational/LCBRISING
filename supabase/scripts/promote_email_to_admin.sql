-- =====================================================================
-- Promote-to-admin: takes a placeholder email and (1) marks the
-- auth.users row email_confirmed_at = now() so verification isn't
-- required, (2) upserts the corresponding public.members row with
-- role=admin + lions_role=international_admin.
--
-- Intended workflow:
--   1. User signs up via /login with whatever email + password.
--   2. Operator runs apply-migration with:
--        sql_path    = supabase/scripts/promote_email_to_admin.sql
--        admin_email = <the email they signed up with>
--      The workflow's 'Locate SQL file' step rewrites the placeholder
--      'admin@lcbrising.org' to the user-supplied email before applying.
--   3. User logs in — they land on /admin as international_admin.
--
-- Idempotent and safe to re-run.
-- =====================================================================

-- 1. Confirm the email (cheap no-op if already confirmed).
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now()),
       updated_at = now()
 where email = 'admin@lcbrising.org';

-- 2. Upsert the matching members row.
insert into public.members (
  user_id, name, email, role, lions_role, status, joined_at
)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  'admin',
  'international_admin',
  'active',
  current_date
from auth.users u
where u.email = 'admin@lcbrising.org'
on conflict (email) do update
   set user_id    = excluded.user_id,
       role       = 'admin',
       lions_role = 'international_admin',
       status     = 'active',
       updated_at = now();

-- Verification — these rows should each show one record.
select id, email, email_confirmed_at, created_at
  from auth.users
 where email = 'admin@lcbrising.org';

select id, email, role, lions_role, status
  from public.members
 where email = 'admin@lcbrising.org';
