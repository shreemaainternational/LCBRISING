import { LIONS_ROLES, type LionsRole, atLeast } from './roles';

/**
 * Permission catalog. Each permission identifies an entity + verb, plus
 * an optional scope constraint. The matrix below states the *minimum*
 * Lions role required to perform the action within its natural scope —
 * resource-level scoping (e.g. you can edit a member only inside your
 * club/district) is enforced by callers via `canActOnScope`.
 */
export const PERMISSIONS = [
  // Members
  'member.read',
  'member.create',
  'member.update',
  'member.delete',
  'member.transfer',

  // Clubs
  'club.read',
  'club.create',
  'club.update',
  'club.delete',

  // Districts / hierarchy
  'district.read',
  'district.update',
  'region.update',
  'zone.update',

  // Officers
  'officer.read',
  'officer.appoint',
  'officer.revoke',

  // Events & attendance
  'event.read',
  'event.create',
  'event.update',
  'event.delete',
  'attendance.record',
  'attendance.read',

  // Trainings & awards
  'training.read',
  'training.assign',
  'award.read',
  'award.grant',

  // Communications
  'communication.send',
  'announcement.publish',

  // Reports / analytics
  'report.read',
  'report.export',

  // Sync / integrations
  'sync.trigger',
  'sync.configure',
  'integration.manage',

  // Admin / audit
  'audit.read',
  'rbac.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Minimum role required for each permission. A role implicitly inherits
 * every permission that a less-privileged role has (via `atLeast`).
 */
const MATRIX: Record<Permission, LionsRole> = {
  // Anyone authenticated (including guest viewers) can read.
  'member.read': 'guest_viewer',
  'club.read': 'guest_viewer',
  'district.read': 'guest_viewer',
  'officer.read': 'guest_viewer',
  'event.read': 'guest_viewer',
  'attendance.read': 'member',
  'training.read': 'member',
  'award.read': 'member',
  'report.read': 'club_officer',

  // Club-level writes
  'member.create': 'club_secretary',
  'member.update': 'club_secretary',
  'attendance.record': 'club_secretary',
  'event.create': 'club_officer',
  'event.update': 'club_officer',
  'announcement.publish': 'club_president',
  'communication.send': 'club_secretary',
  'report.export': 'club_secretary',

  // Mid-tier
  'event.delete': 'club_president',
  'member.transfer': 'club_president',
  'officer.appoint': 'club_president',
  'officer.revoke': 'club_president',
  'training.assign': 'zone_chairperson',
  'award.grant': 'district_governor',

  // District+
  'club.create': 'district_governor',
  'club.update': 'district_governor',
  'club.delete': 'multiple_district_admin',
  'member.delete': 'district_governor',
  'district.update': 'district_governor',
  'region.update': 'district_governor',
  'zone.update': 'district_governor',
  'sync.trigger': 'cabinet_officer',
  'sync.configure': 'district_governor',
  'integration.manage': 'multiple_district_admin',

  // Top tier
  'audit.read': 'district_governor',
  'rbac.manage': 'international_admin',
};

export function can(role: LionsRole, perm: Permission): boolean {
  const required = MATRIX[perm];
  return atLeast(role, required);
}

/** Bulk: every permission a role has. */
export function permissionsFor(role: LionsRole): Permission[] {
  return PERMISSIONS.filter((p) => can(role, p));
}

/**
 * Cross-scope guard. A user's role grants the permission *within* their
 * scope; this checks whether `target` is inside that scope.
 *
 *   - international/MD admins: anything goes
 *   - district roles: target must share district_id
 *   - zone/region: target must share zone_id / region_id
 *   - club roles: target must share club_id
 *   - member/guest: target must be self
 */
export type ActorScope = {
  role: LionsRole;
  member_id?: string | null;
  club_id?: string | null;
  zone_id?: string | null;
  region_id?: string | null;
  district_id?: string | null;
  multiple_district_id?: string | null;
};

export type TargetScope = {
  member_id?: string | null;
  club_id?: string | null;
  zone_id?: string | null;
  region_id?: string | null;
  district_id?: string | null;
  multiple_district_id?: string | null;
};

export function canActOnScope(actor: ActorScope, target: TargetScope): boolean {
  switch (actor.role) {
    case 'international_admin':
      return true;
    case 'multiple_district_admin':
      return (
        !!actor.multiple_district_id &&
        actor.multiple_district_id === target.multiple_district_id
      );
    case 'district_governor':
    case 'vice_district_governor':
    case 'cabinet_officer':
      return (
        !!actor.district_id && actor.district_id === target.district_id
      );
    case 'region_chairperson':
      return !!actor.region_id && actor.region_id === target.region_id;
    case 'zone_chairperson':
      return !!actor.zone_id && actor.zone_id === target.zone_id;
    case 'club_president':
    case 'club_secretary':
    case 'club_treasurer':
    case 'club_officer':
      return !!actor.club_id && actor.club_id === target.club_id;
    case 'member':
    case 'guest_viewer':
      return !!actor.member_id && actor.member_id === target.member_id;
  }
}

/** Combined check: permission AND scope. */
export function authorize(
  actor: ActorScope,
  perm: Permission,
  target: TargetScope,
): boolean {
  return can(actor.role, perm) && canActOnScope(actor, target);
}

/** Useful for debugging / surfacing capabilities in the UI. */
export function permissionMatrix(): Record<LionsRole, Permission[]> {
  return Object.fromEntries(
    LIONS_ROLES.map((r) => [r, permissionsFor(r)]),
  ) as Record<LionsRole, Permission[]>;
}
