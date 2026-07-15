-- 0059_fix_members_rls_recursion.sql
--
-- Fix: "infinite recursion detected in policy for relation \"members\""
--
-- The original policies (0001_initial_schema.sql) inline a subquery against
-- public.members to resolve the caller's own member id / club id, e.g.
--
--     create policy "members_self_read" on public.members for select
--       using (... or club_id = (select club_id from public.members
--                                where user_id = auth.uid()));
--
-- Because that subquery reads public.members under the *invoker's* RLS
-- context, Postgres must evaluate members_self_read to run it — which runs
-- the subquery again — which re-evaluates the policy... hence the recursion.
-- Any statement that touches members through RLS (including the events and
-- event_rsvps policies, which sub-select from members) trips it. That is why
-- the Create Event form surfaced the error.
--
-- The fix is to resolve "my member id" and "my club id" through
-- SECURITY DEFINER helper functions. SECURITY DEFINER runs with the
-- function owner's rights and bypasses RLS on the tables it reads, so the
-- lookup no longer re-enters the members policies. This mirrors the existing
-- public.is_admin() / public.current_member() helpers, which are already
-- SECURITY DEFINER for exactly this reason.
--
-- Idempotent: safe to re-run.

-- Helper: the authenticated user's own member id (RLS-safe).
create or replace function public.current_member_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid() limit 1;
$$;

-- Helper: the authenticated user's own club id (RLS-safe).
create or replace function public.current_member_club_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from public.members where user_id = auth.uid() limit 1;
$$;

-- Members: a member can read peers in their club; admins can do everything.
drop policy if exists "members_self_read" on public.members;
create policy "members_self_read" on public.members for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or club_id = public.current_member_club_id()
  );

-- Dues: member sees own dues; admins see all.
drop policy if exists "dues_self_read" on public.dues;
create policy "dues_self_read" on public.dues for select
  using (member_id = public.current_member_id() or public.is_admin());

-- Payments: member sees own payments; admins see all.
drop policy if exists "payments_self_read" on public.payments;
create policy "payments_self_read" on public.payments for select
  using (member_id = public.current_member_id() or public.is_admin());

-- Events: public events readable by anyone, private ones by club members.
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events for select
  using (
    is_public
    or public.is_admin()
    or club_id = public.current_member_club_id()
  );

-- RSVPs: a user can RSVP themselves; admins manage all.
drop policy if exists "rsvps_self_read" on public.event_rsvps;
create policy "rsvps_self_read" on public.event_rsvps for select
  using (member_id = public.current_member_id() or public.is_admin());

drop policy if exists "rsvps_self_write" on public.event_rsvps;
create policy "rsvps_self_write" on public.event_rsvps for insert
  with check (member_id = public.current_member_id() or public.is_admin());
