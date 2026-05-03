-- Run this in the SQL editor to confirm the schema is fully in place.
-- All three queries should return rows.

-- 1. Tables (expect 10 rows)
select tablename
from pg_tables
where schemaname = 'public'
  and tablename in ('clubs','members','dues','payments','activities',
                    'donations','events','event_rsvps',
                    'communications','automation_jobs')
order by tablename;

-- 2. RLS policies (expect 19 rows)
select tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Auth trigger that auto-creates a member row on signup
select tgname, tgenabled
from pg_trigger
where tgname = 'trg_on_auth_user_created';
