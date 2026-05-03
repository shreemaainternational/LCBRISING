import { createClient } from '@/lib/supabase/server';
import type { Member, MemberRole } from '@/lib/supabase/database.types';

const ADMIN_ROLES: MemberRole[] = ['admin', 'president', 'secretary', 'treasurer'];

export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (data as Member | null) ?? null;
}

export async function requireAdmin(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member || !ADMIN_ROLES.includes(member.role)) {
    throw new Response('Unauthorized', { status: 403 });
  }
  return member;
}

export function isAdminRole(role: MemberRole) {
  return ADMIN_ROLES.includes(role);
}
