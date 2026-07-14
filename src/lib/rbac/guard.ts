import { NextResponse } from 'next/server';
import { getCurrentMember } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { isDevAuthBypass } from '@/lib/env';
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
 * Delegates the actual member lookup to getCurrentMember() so the RBAC
 * layer sees exactly the same identity the rest of the app does. That
 * gives permission-gated routes (club.create, sync.trigger, …) the same
 * safety nets getCurrentMember() provides:
 *   - the bootstrap-admin allowlist (BOOTSTRAP_ADMIN_EMAILS — the owner
 *     is never locked out of their own CRM on a fresh deployment),
 *   - the Bearer access-token fallback for stale/oversized SSR cookies,
 *   - the service-role lookup tiers, and
 *   - legacy 'admin' → international_admin promotion.
 *
 * Without this, currentActor() ran its own RLS-only query and resolved
 * the owner to a plain 'member' whenever no members row existed yet,
 * which surfaced as spurious "forbidden" errors on club create + sync.
 */
export async function currentActor(): Promise<(ActorScope & { user_id: string }) | null> {
  if (isDevAuthBypass()) {
    return {
      user_id: BYPASS_USER_ID,
      role: 'international_admin',
      member_id: null,
      club_id: null,
      district_id: null,
    };
  }

  const member = await getCurrentMember();
  if (!member) return null;

  // Members with the legacy role 'admin' are platform owners — always
  // promote them to international_admin regardless of lions_role.
  const legacyAdmin = (member.role as string | undefined) === 'admin';
  const role: LionsRole = legacyAdmin
    ? 'international_admin'
    : ((member.lions_role as LionsRole | null | undefined) ??
       legacyToLions((member.role as string | undefined) ?? 'member'));

  return {
    user_id: member.user_id ?? member.id ?? BYPASS_USER_ID,
    role,
    member_id: member.id ?? null,
    club_id: member.club_id ?? null,
    district_id: member.district_id ?? null,
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
