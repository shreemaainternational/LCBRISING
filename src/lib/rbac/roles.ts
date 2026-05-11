/**
 * Lions federation role hierarchy. Mirrors the `lions_role` PostgreSQL
 * enum defined in supabase/migrations/0003_enterprise_crm.sql.
 *
 * Ordered from most privileged (rank 0) to least privileged.
 */

export const LIONS_ROLES = [
  'international_admin',
  'multiple_district_admin',
  'district_governor',
  'vice_district_governor',
  'cabinet_officer',
  'region_chairperson',
  'zone_chairperson',
  'club_president',
  'club_secretary',
  'club_treasurer',
  'club_officer',
  'member',
  'guest_viewer',
] as const;

export type LionsRole = (typeof LIONS_ROLES)[number];

const RANK = new Map<LionsRole, number>(
  LIONS_ROLES.map((r, i) => [r, i] as const),
);

/** Lower rank == higher privilege. */
export function rankOf(role: LionsRole): number {
  return RANK.get(role) ?? Number.POSITIVE_INFINITY;
}

/** True if `a` is at least as privileged as `b`. */
export function atLeast(a: LionsRole, b: LionsRole): boolean {
  return rankOf(a) <= rankOf(b);
}

/** Scope a role belongs to (used by the permission matrix). */
export type RoleScope =
  | 'international'
  | 'multiple_district'
  | 'district'
  | 'region'
  | 'zone'
  | 'club'
  | 'self';

export const ROLE_SCOPE: Record<LionsRole, RoleScope> = {
  international_admin: 'international',
  multiple_district_admin: 'multiple_district',
  district_governor: 'district',
  vice_district_governor: 'district',
  cabinet_officer: 'district',
  region_chairperson: 'region',
  zone_chairperson: 'zone',
  club_president: 'club',
  club_secretary: 'club',
  club_treasurer: 'club',
  club_officer: 'club',
  member: 'self',
  guest_viewer: 'self',
};

export function isClubRole(r: LionsRole): boolean {
  return ROLE_SCOPE[r] === 'club';
}

export function isDistrictOrAbove(r: LionsRole): boolean {
  return ['international', 'multiple_district', 'district'].includes(ROLE_SCOPE[r]);
}
