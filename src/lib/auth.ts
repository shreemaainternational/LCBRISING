import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Member, MemberRole } from '@/lib/supabase/database.types';

const ADMIN_ROLES: MemberRole[] = ['admin', 'president', 'secretary', 'treasurer'];

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

export async function requireAdmin(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect('/login?redirectTo=/admin');
  if (!ADMIN_ROLES.includes(member.role)) redirect('/?denied=admin');
  return member;
}

export function isAdminRole(role: MemberRole) {
  return ADMIN_ROLES.includes(role);
}
