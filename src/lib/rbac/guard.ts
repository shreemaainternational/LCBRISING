import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';
import {
  authorize,
  can,
  type Permission,
  type ActorScope,
  type TargetScope,
} from './permissions';
import type { LionsRole } from './roles';

/**
 * Resolve the current authenticated member into an RBAC actor scope.
 * Returns null when there is no logged-in user.
 */
export async function currentActor(): Promise<(ActorScope & { user_id: string }) | null> {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;

  const { data } = await supa
    .from('members')
    .select('id, club_id, district_id, lions_role, role')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fall back to legacy member_role when lions_role is null.
  const role: LionsRole =
    (data?.lions_role as LionsRole | undefined) ??
    legacyToLions((data?.role as string | undefined) ?? 'member');

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
