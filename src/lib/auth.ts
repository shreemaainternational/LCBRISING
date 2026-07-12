import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Member, MemberRole } from '@/lib/supabase/database.types';
import { isDevAuthBypass } from '@/lib/env';

const ADMIN_ROLES: MemberRole[] = ['admin', 'president', 'secretary', 'treasurer'];

// Development-only diagnostic identity returned when isDevAuthBypass()
// is true (ADMIN_AUTH_BYPASS=1 in a non-production build). Never active
// in production — see isDevAuthBypass() in @/lib/env.
const BYPASS_MEMBER = {
  id: '00000000-0000-0000-0000-000000000000',
  user_id: '00000000-0000-0000-0000-000000000000',
  name: 'Bypass Admin',
  email: 'bypass@local',
  role: 'admin' as MemberRole,
  lions_role: null,
  status: 'active',
  club_id: null,
  joined_at: null,
} as unknown as Member;

/**
 * Resolve the current member for the logged-in auth user.
 *
 * Multi-tier lookup so a valid auth session ALWAYS yields a member
 * row — otherwise the admin layout redirects to /login while
 * middleware redirects back to /admin → ERR_TOO_MANY_REDIRECTS:
 *
 *   1. RLS-scoped query (normal path).
 *   2. Service-role query by user_id — covers a members table with
 *      no "read your own row" RLS policy.
 *   3. Service-role query by email, then back-fill user_id — covers
 *      rows created before the auth user existed (seeded / imported).
 *   4. Auto-provision a minimal member row — covers a brand-new
 *      auth user with no members row at all.
 */
export async function getCurrentMember(): Promise<Member | null> {
  // Development-only bypass — short-circuit BEFORE any Supabase call.
  // Hard-disabled in production, so it can never expose /admin publicly.
  if (isDevAuthBypass()) return BYPASS_MEMBER;

  const supabase = await createClient();
  let { data: { user } } = await supabase.auth.getUser();

  // Fallback: a Bearer access token in the Authorization header. The
  // browser holds a valid Supabase session (it can upload straight to
  // storage) even when the SSR cookie is stale, oversized/chunked, or
  // lost to a browser-vs-server refresh-token race. Authenticated
  // clients forward that token so mutations don't fail with "not signed
  // in" while the user is clearly logged in.
  if (!user) {
    try {
      const authz = (await headers()).get('authorization');
      const token = authz?.toLowerCase().startsWith('bearer ')
        ? authz.slice(7).trim()
        : null;
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        user = data.user;
      }
    } catch {
      // headers() unavailable outside a request scope — ignore.
    }
  }

  if (!user) return null;

  // Tier 1 — RLS-scoped.
  const { data: rlsRow } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (rlsRow) return rlsRow as Member;

  // Tiers 2-4 need the service role. If it isn't configured we can't
  // recover — return null and let the caller handle it.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createAdminClient();

  // Tier 2 — by user_id, bypassing RLS.
  const { data: byUserId } = await admin
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (byUserId) return byUserId as Member;

  // Tier 3 — by email; back-fill the missing user_id link.
  if (user.email) {
    const { data: byEmail } = await admin
      .from('members')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();
    if (byEmail) {
      if (!byEmail.user_id) {
        await admin.from('members').update({ user_id: user.id }).eq('id', byEmail.id);
      }
      return { ...byEmail, user_id: user.id } as Member;
    }
  }

  // Tier 4 — auto-provision a minimal member row so the session is
  // never "orphaned". Defaults to the lowest-privilege role.
  const { data: created } = await admin
    .from('members')
    .insert({
      user_id: user.id,
      email: user.email ?? `${user.id}@placeholder.local`,
      name:
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split('@')[0] ??
        'New Member',
      role: 'member',
      status: 'pending',
    })
    .select()
    .single();

  return (created as Member | null) ?? null;
}

/**
 * Guard for API route handlers. On denial it THROWS a NextResponse
 * (which is an instanceof Response), so the standard route idiom
 * `catch (err) { if (err instanceof Response) return err; throw err; }`
 * returns a real 401/403 for a denial and re-throws anything else.
 * Returns the member on success.
 *
 * The trailing `throw err` matters: without it, a non-Response error
 * (a transient getCurrentMember() failure, or an accidental redirect()
 * throwing NEXT_REDIRECT) would be swallowed and the handler body would
 * run UNAUTHENTICATED. Re-throwing fails closed as a 500 instead.
 *
 * Do NOT use this in a page/server component — use requireAdminPage(),
 * which redirects.
 */
export async function requireAdmin(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) {
    throw NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(member.role)) {
    throw NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return member;
}

/**
 * Guard for pages / server components. Redirects to /login (or the
 * denied page) instead of throwing a Response.
 */
export async function requireAdminPage(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/admin');
  if (!ADMIN_ROLES.includes(member.role)) redirect('/?denied=admin');
  return member;
}

export function isAdminRole(role: MemberRole) {
  return ADMIN_ROLES.includes(role);
}
