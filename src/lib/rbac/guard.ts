import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import { env } from '@/lib/env';
import {
  authorize,
  can,
  type Permission,
  type ActorScope,
  type TargetScope,
} from './permissions';
import type { LionsRole } from './roles';

const BYPASS_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Resolve the current authenticated member into an RBAC actor scope.
 * Returns null when there is no logged-in user.
 *
 * Honours the same diagnostic bypass that getCurrentMember() uses
 * (env ADMIN_AUTH_BYPASS=1 or the lcbr_crm cookie set by /crm) so
 * an admin who entered via the dev shortcut isn't locked out of
 * permission-gated routes.
 */
export async function currentActor(): Promise<(ActorScope & { user_id: string }) | null> {
  const cookieStore = await cookies();
  const crmCookie = cookieStore.get('lcbr_crm')?.value === '1';
  if (env.ADMIN_AUTH_BYPASS === '1' || crmCookie) {
    return {
      user_id: BYPASS_USER_ID,
      role: 'international_admin',
      member_id: null,
      club_id: null,
      district_id: null,
    };
  }

  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;

  const { data } = await supa
    .from('members')
    .select('id, club_id, district_id, lions_role, role')
    .eq('user_id', user.id)
    .maybeSingle();

  // Members with the legacy role 'admin' are platform owners — always
  // promote them to international_admin regardless of lions_role.
  const legacyAdmin = (data?.role as string | undefined) === 'admin';
  const role: LionsRole = legacyAdmin
    ? 'international_admin'
    : ((data?.lions_role as LionsRole | undefined) ??
       legacyToLions((data?.role as string | undefined) ?? 'member'));

  return {
    user_id: user.id,
    role,
    member_id: data?.id ?? null,
    club_id: data?.club_id ?? null,
    district_id: data?.district_id ?? null,
  };
}

function legacyToLions(legacy: string): LionsRole {
  switch (legacy) {
    case 'admin': return 'international_admin';
    case 'president': return 'club_president';
    case 'secretary': return 'club_secretary';
    case 'treasurer': return 'club_treasurer';
    case 'officer': return 'club_officer';
    default: return 'member';
  }
}

/**
 * Server-side permission guard for route handlers.
 * Returns the actor on success, or a NextResponse to return immediately
 * on failure. Emits an audit log on denial.
 */
export async function requirePermission(
  perm: Permission,
  target: TargetScope = {},
): Promise<(ActorScope & { user_id: string }) | NextResponse> {
  const actor = await currentActor();
  if (!actor) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const ok = Object.keys(target).length === 0
    ? can(actor.role, perm)
    : authorize(actor, perm, target);

  if (!ok) {
    await writeAudit({
      action: 'rbac.denied',
      actor_user_id: actor.user_id,
      actor_member_id: actor.member_id ?? null,
      payload: { permission: perm, target },
    });
    return NextResponse.json(
      { error: 'forbidden', permission: perm },
      { status: 403 },
    );
  }
  return actor;
}

export function isGuardFailure(
  x: unknown,
): x is NextResponse {
  return x instanceof NextResponse;
}
