import type { SupabaseClient } from '@supabase/supabase-js';
import { lionsYearFor } from '@/lib/lions-calendar-meta';
import { pushToMember } from '@/lib/push';

/**
 * Club → Zone → Region → District placement, derived from the chain the
 * same way the `club_hierarchy` view (migration 0088) does it:
 *   zone     = the club's zone (if not deleted)
 *   region   = the zone's region, else the club's own region
 *   district = the region's district, else the zone's, else the club's
 * Computed here from the base tables so pages work before 0088 is applied.
 */
export type ClubPlacement = {
  club_id: string;
  club_name: string;
  club_number: string | null;
  city: string | null;
  deleted: boolean;
  zone_id: string | null;
  zone_name: string | null;
  region_id: string | null;
  region_name: string | null;
  district_id: string | null;
  district_code: string | null;
  district_name: string | null;
};

type ClubRow = {
  id: string; name: string; club_number: string | null; city: string | null;
  zone_id: string | null; region_id: string | null; district_id: string | null;
  deleted_at: string | null;
};
type ZoneRow = { id: string; name: string; region_id: string | null; district_id: string | null };
type RegionRow = { id: string; name: string; district_id: string | null };
type DistrictRow = { id: string; code: string; name: string };

export async function loadClubPlacements(
  db: SupabaseClient,
  opts: { includeDeleted?: boolean; clubIds?: string[] } = {},
): Promise<ClubPlacement[]> {
  let clubQuery = db
    .from('clubs')
    .select('id, name, club_number, city, zone_id, region_id, district_id, deleted_at')
    .order('name');
  if (!opts.includeDeleted) clubQuery = clubQuery.is('deleted_at', null);
  if (opts.clubIds?.length) clubQuery = clubQuery.in('id', opts.clubIds);

  const [{ data: clubs }, { data: zones }, { data: regions }, { data: districts }] = await Promise.all([
    clubQuery,
    db.from('zones').select('id, name, region_id, district_id').is('deleted_at', null),
    db.from('regions').select('id, name, district_id').is('deleted_at', null),
    db.from('districts').select('id, code, name'),
  ]);

  const zoneById = new Map((zones ?? []).map((z: ZoneRow) => [z.id, z]));
  const regionById = new Map((regions ?? []).map((r: RegionRow) => [r.id, r]));
  const districtById = new Map((districts ?? []).map((d: DistrictRow) => [d.id, d]));

  return ((clubs ?? []) as ClubRow[]).map((c) => {
    const zone = c.zone_id ? zoneById.get(c.zone_id) ?? null : null;
    const region = regionById.get((zone?.region_id ?? c.region_id) ?? '') ?? null;
    const districtId = region?.district_id ?? zone?.district_id ?? c.district_id ?? null;
    const district = districtId ? districtById.get(districtId) ?? null : null;
    return {
      club_id: c.id,
      club_name: c.name,
      club_number: c.club_number ?? null,
      city: c.city ?? null,
      deleted: !!c.deleted_at,
      zone_id: zone?.id ?? null,
      zone_name: zone?.name ?? null,
      region_id: region?.id ?? null,
      region_name: region?.name ?? null,
      district_id: district?.id ?? districtId,
      district_code: district?.code ?? null,
      district_name: district?.name ?? null,
    };
  });
}

/** True when an error means a table / view / function from a migration that
 *  hasn't been applied yet (PostgREST schema-cache misses, Postgres 42P01/42883). */
export function isMissingSchemaObject(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return ['PGRST202', 'PGRST205', '42P01', '42883'].includes(err.code ?? '')
    || /does not exist|could not find the (function|table)/i.test(err.message ?? '');
}

export type AssignmentPeriod = {
  id: string;
  club_id: string | null;
  club_name: string | null;
  zone_name: string | null;
  region_name: string | null;
  district_code: string | null;
  lions_year: string;
  effective_from: string;
  effective_to: string | null;
  source: string;
  reason: string | null;
};

/** A member's club periods, newest first. `available` is false when
 *  migration 0088 (member_club_assignments) isn't applied yet. */
export async function loadAssignmentHistory(
  db: SupabaseClient,
  memberId: string,
): Promise<{ available: boolean; periods: AssignmentPeriod[] }> {
  const { data, error } = await db
    .from('member_club_assignments')
    .select('id, club_id, zone_id, region_id, district_id, lions_year, effective_from, effective_to, source, reason, created_at')
    .eq('member_id', memberId)
    .order('effective_from', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return { available: !isMissingSchemaObject(error), periods: [] };

  type Row = {
    id: string; club_id: string | null; zone_id: string | null; region_id: string | null;
    district_id: string | null; lions_year: string; effective_from: string;
    effective_to: string | null; source: string; reason: string | null;
  };
  const rows = (data ?? []) as Row[];
  const ids = (k: keyof Row) => [...new Set(rows.map((r) => r[k]).filter((v): v is string => !!v))];
  const [clubs, zones, regions, districts] = await Promise.all([
    ids('club_id').length ? db.from('clubs').select('id, name').in('id', ids('club_id')) : { data: [] },
    ids('zone_id').length ? db.from('zones').select('id, name').in('id', ids('zone_id')) : { data: [] },
    ids('region_id').length ? db.from('regions').select('id, name').in('id', ids('region_id')) : { data: [] },
    ids('district_id').length ? db.from('districts').select('id, code').in('id', ids('district_id')) : { data: [] },
  ]);
  const name = (list: { id: string; name?: string; code?: string }[] | null, id: string | null) =>
    id ? (list ?? []).find((x) => x.id === id) : undefined;

  return {
    available: true,
    periods: rows.map((r) => ({
      id: r.id,
      club_id: r.club_id,
      club_name: name(clubs.data, r.club_id)?.name ?? null,
      zone_name: name(zones.data, r.zone_id)?.name ?? null,
      region_name: name(regions.data, r.region_id)?.name ?? null,
      district_code: name(districts.data, r.district_id)?.code ?? null,
      lions_year: r.lions_year,
      effective_from: r.effective_from,
      effective_to: r.effective_to,
      source: r.source,
      reason: r.reason,
    })),
  };
}

// ---------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------

export type TransferMember = {
  id: string;
  name: string;
  lions_member_id: string | null;
  club_id: string | null;
  district_id: string | null;
  deleted_at: string | null;
};

export type TransferPreview = {
  member: { id: string; name: string; lions_member_id: string | null };
  from: ClubPlacement | null;
  to: ClubPlacement | null;
  effective_on: string;
  lions_year: string;
  /** Problems that block the transfer. */
  blockers: string[];
  /** Things the approver should know about but that don't block it. */
  warnings: string[];
};

export async function buildTransferPreview(
  db: SupabaseClient,
  member: TransferMember,
  toClubId: string,
  effectiveOn: string,
): Promise<TransferPreview> {
  const ids = [toClubId, ...(member.club_id ? [member.club_id] : [])];
  const placements = await loadClubPlacements(db, { includeDeleted: true, clubIds: ids });
  const to = placements.find((p) => p.club_id === toClubId) ?? null;
  const from = member.club_id ? placements.find((p) => p.club_id === member.club_id) ?? null : null;

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (member.deleted_at) blockers.push('This member record has been removed.');
  if (!to) blockers.push('The target club does not exist.');
  else if (to.deleted) blockers.push('The target club has been removed.');
  if (to && member.club_id === to.club_id) blockers.push('The member already belongs to this club.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveOn)) blockers.push('Effective date must be YYYY-MM-DD.');

  const { data: open, error: openErr } = await db
    .from('member_club_assignments')
    .select('effective_from')
    .eq('member_id', member.id)
    .is('effective_to', null)
    .maybeSingle();
  if (!openErr && open?.effective_from && effectiveOn < open.effective_from) {
    blockers.push(`Effective date is before the current assignment began (${open.effective_from}).`);
  }
  if (openErr && isMissingSchemaObject(openErr)) {
    warnings.push('Assignment history is not enabled yet (migration 0088), so this transfer will only be recorded in the audit log.');
  }

  if (to && !to.zone_id) warnings.push('The target club is not assigned to a zone.');
  if (to && to.zone_id && !to.region_id) warnings.push('The target club\'s zone is not linked to a region, so the member will have no current region.');
  if (to && !to.district_id) warnings.push('The target club has no district.');
  if (from && to && from.district_id && to.district_id && from.district_id !== to.district_id) {
    warnings.push('This moves the member to a different district.');
  }
  if (!member.lions_member_id) warnings.push('This member has no Lions membership number on record.');

  const [y, m, d] = effectiveOn.split('-').map(Number);
  const lionsYear = Number.isFinite(y) ? lionsYearFor(new Date(y, (m || 1) - 1, d || 1)) : '';

  return {
    member: { id: member.id, name: member.name, lions_member_id: member.lions_member_id },
    from, to, effective_on: effectiveOn, lions_year: lionsYear, blockers, warnings,
  };
}

export type TransferOutcome =
  | { status: 'transferred'; history_recorded: boolean }
  | { status: 'unchanged' | 'duplicate'; history_recorded: boolean };

const RPC_ERRORS: Record<string, string> = {
  member_not_found: 'Member not found.',
  member_deleted: 'This member record has been removed.',
  target_club_invalid: 'The target club does not exist or has been removed.',
  effective_date_before_current_assignment: 'Effective date is before the current assignment began.',
};

export class TransferError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/**
 * Apply a transfer through transfer_member() (migration 0088): one
 * transaction, history recorded by the trigger, idempotent per request id.
 * Before 0088 is applied, falls back to the previous direct update, with
 * the district derived from the target club instead of trusted from input.
 */
export async function executeTransfer(
  db: SupabaseClient,
  args: {
    memberId: string; toClubId: string; effectiveOn: string; reason: string;
    actorMemberId: string | null; source: 'transfer' | 'bulk' | 'correction'; requestId: string | null;
  },
): Promise<TransferOutcome> {
  const { data, error } = await db.rpc('transfer_member', {
    p_member_id: args.memberId,
    p_to_club_id: args.toClubId,
    p_effective_on: args.effectiveOn,
    p_reason: args.reason,
    p_actor_member_id: args.actorMemberId,
    p_source: args.source,
    p_request_id: args.requestId,
  });

  if (!error) {
    const status = (data as { status?: string } | null)?.status;
    if (status === 'transferred' || status === 'unchanged' || status === 'duplicate') {
      return { status, history_recorded: true };
    }
    throw new TransferError('Unexpected response from transfer_member.', 500);
  }

  const known = Object.keys(RPC_ERRORS).find((k) => error.message?.includes(k));
  if (known) throw new TransferError(RPC_ERRORS[known], known === 'member_not_found' ? 404 : 400);
  if (!isMissingSchemaObject(error)) throw new TransferError(error.message, 500);

  // Fallback: migration 0088 not applied yet.
  const [to] = await loadClubPlacements(db, { clubIds: [args.toClubId] });
  if (!to) throw new TransferError(RPC_ERRORS.target_club_invalid, 400);
  const { data: current } = await db.from('members').select('club_id').eq('id', args.memberId).maybeSingle();
  if (current?.club_id === args.toClubId) return { status: 'unchanged', history_recorded: false };
  const update: Record<string, unknown> = { club_id: args.toClubId };
  if (to.district_id) update.district_id = to.district_id;
  const { error: upErr } = await db.from('members').update(update).eq('id', args.memberId);
  if (upErr) throw new TransferError(upErr.message, 500);
  return { status: 'transferred', history_recorded: false };
}

/** Best-effort push to platform admins. A fixed tag per member collapses a
 *  retried notification into one on each device. */
export async function notifyAdmins(
  db: SupabaseClient,
  payload: { title: string; body: string; url: string; tag: string },
): Promise<void> {
  try {
    const { data } = await db.from('members').select('id').eq('role', 'admin').is('deleted_at', null);
    await Promise.all((data ?? []).map((m: { id: string }) => pushToMember(m.id, payload).catch(() => null)));
  } catch {
    // Notifications never block the transfer itself.
  }
}

export function placementLabel(p: ClubPlacement | null): string {
  if (!p) return 'No club';
  return [p.club_name, p.zone_name, p.region_name, p.district_code ? `District ${p.district_code}` : null]
    .filter(Boolean).join(' · ');
}
