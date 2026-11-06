import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember, isAdminRole } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { lionsYearFor } from '@/lib/lions-calendar-meta';
import { loadClubPlacements, isMissingSchemaObject, type ClubPlacement } from '@/lib/org-hierarchy';

/**
 * Data for the club-wise Member Directory (/directory/*).
 *
 * Visibility follows the site's existing policy: clubs, their placement and
 * officers are public; the member roster is for signed-in members; contact
 * details and membership numbers are for admins only. Fields a viewer may
 * not see are removed here, server-side, so they never reach the browser.
 */

export type Viewer = { signedIn: boolean; isAdmin: boolean };

export async function getViewer(): Promise<Viewer> {
  const member = await getCurrentMember().catch(() => null);
  return { signedIn: !!member, isAdmin: !!member && isAdminRole(member.role) };
}

export function directoryDb(): SupabaseClient | Promise<SupabaseClient> {
  // Service role: the hierarchy and members tables are member/admin-only
  // under RLS, and the members policy can recurse on older databases.
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : createClient();
}

export type DirectoryClub = ClubPlacement & { active_members: number };

export async function loadDirectoryClubs(): Promise<DirectoryClub[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const db = await directoryDb();
    const [placements, { data: members }] = await Promise.all([
      loadClubPlacements(db),
      db.from('members').select('club_id').is('deleted_at', null).eq('status', 'active'),
    ]);
    const counts = new Map<string, number>();
    for (const m of (members ?? []) as { club_id: string | null }[]) {
      if (m.club_id) counts.set(m.club_id, (counts.get(m.club_id) ?? 0) + 1);
    }
    return placements.map((p) => ({ ...p, active_members: counts.get(p.club_id) ?? 0 }));
  } catch {
    return [];
  }
}

export type DirectoryMember = {
  id: string;
  name: string;
  avatar_url: string | null;
  designation: string | null;
  status: string;
  joined_at: string | null;
  club_id: string | null;
  club_name: string | null;
  zone_name: string | null;
  region_name: string | null;
  district_code: string | null;
  // Admin only — null for everyone else.
  lions_member_id: string | null;
  email: string | null;
  phone: string | null;
};

type MemberRow = {
  id: string; name: string; avatar_url: string | null; lions_role: string | null;
  status: string; joined_at: string | null; club_id: string | null;
  lions_member_id: string | null; email: string | null; phone: string | null;
};

function toDirectoryMember(m: MemberRow, clubs: Map<string, ClubPlacement>, viewer: Viewer, clubIdOverride?: string | null): DirectoryMember {
  const clubId = clubIdOverride !== undefined ? clubIdOverride : m.club_id;
  const p = clubId ? clubs.get(clubId) : undefined;
  return {
    id: m.id,
    name: m.name,
    avatar_url: m.avatar_url,
    designation: m.lions_role,
    status: m.status,
    joined_at: m.joined_at,
    club_id: clubId,
    club_name: p?.club_name ?? null,
    zone_name: p?.zone_name ?? null,
    region_name: p?.region_name ?? null,
    district_code: p?.district_code ?? null,
    lions_member_id: viewer.isAdmin ? m.lions_member_id : null,
    email: viewer.isAdmin ? m.email : null,
    phone: viewer.isAdmin ? m.phone : null,
  };
}

/** Lionistic Year bounds: '2025-26' → 2025-07-01 … 2026-06-30. */
export function lionsYearBounds(year: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(year);
  if (!m) return null;
  const y = Number(m[1]);
  return { start: `${y}-07-01`, end: `${y + 1}-06-30` };
}

export const currentLionsYear = () => lionsYearFor(new Date());

/**
 * Members for the directory. With no `year` (or the current year) this is
 * the current roster. For a past Lionistic Year it uses the assignment
 * history (migration 0088): everyone whose club period overlapped that year,
 * listed under the club they were in. `historyAvailable` is false when the
 * history table does not exist yet.
 */
export async function loadDirectoryMembers(
  viewer: Viewer,
  opts: { clubId?: string; year?: string } = {},
): Promise<{ members: DirectoryMember[]; years: string[]; historyAvailable: boolean }> {
  const current = currentLionsYear();
  if (!viewer.signedIn || !isSupabaseConfigured()) return { members: [], years: [current], historyAvailable: false };

  const db = await directoryDb();
  const placements = await loadClubPlacements(db, { includeDeleted: true });
  const clubs = new Map(placements.map((p) => [p.club_id, p]));

  const { data: yearRows, error: yearErr } = await db.from('member_club_assignments').select('lions_year');
  const historyAvailable = !yearErr || !isMissingSchemaObject(yearErr);
  const years = [...new Set([current, ...((yearRows ?? []) as { lions_year: string }[]).map((r) => r.lions_year)])]
    .sort().reverse();

  const select = 'id, name, avatar_url, lions_role, status, joined_at, club_id, lions_member_id, email, phone';
  const bounds = opts.year && opts.year !== current ? lionsYearBounds(opts.year) : null;

  if (bounds && historyAvailable) {
    let q = db.from('member_club_assignments')
      .select('member_id, club_id, effective_from')
      .lte('effective_from', bounds.end)
      .or(`effective_to.is.null,effective_to.gte.${bounds.start}`)
      .order('effective_from', { ascending: false });
    if (opts.clubId) q = q.eq('club_id', opts.clubId);
    const { data: periods } = await q;
    // Latest period in that year wins when a member moved during it.
    const clubByMember = new Map<string, string | null>();
    for (const p of (periods ?? []) as { member_id: string; club_id: string | null }[]) {
      if (!clubByMember.has(p.member_id)) clubByMember.set(p.member_id, p.club_id);
    }
    if (!clubByMember.size) return { members: [], years, historyAvailable };
    const { data } = await db.from('members').select(select).in('id', [...clubByMember.keys()]).is('deleted_at', null).order('name');
    return {
      members: ((data ?? []) as MemberRow[]).map((m) => toDirectoryMember(m, clubs, viewer, clubByMember.get(m.id) ?? null)),
      years, historyAvailable,
    };
  }

  let q = db.from('members').select(select).is('deleted_at', null).order('name').limit(2000);
  if (opts.clubId) q = q.eq('club_id', opts.clubId);
  const { data } = await q;
  return {
    members: ((data ?? []) as MemberRow[]).map((m) => toDirectoryMember(m, clubs, viewer)),
    years, historyAvailable,
  };
}

export type DirectoryOfficer = { id: string; role: string; name: string; avatar_url: string | null; term_start: string | null };

/** Active officers for a club (public, as on the existing directory page). */
export async function loadClubOfficers(clubId: string): Promise<DirectoryOfficer[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const db = await directoryDb();
    const { data } = await db
      .from('officers')
      .select('id, role, term_start, member:members!officers_member_id_fkey(name, avatar_url)')
      .eq('scope_kind', 'club').eq('scope_id', clubId).eq('status', 'active');
    type Row = { id: string; role: string; term_start: string | null; member: { name: string; avatar_url: string | null } | null };
    return ((data ?? []) as unknown as Row[])
      .filter((o) => o.member)
      .map((o) => ({ id: o.id, role: o.role, name: o.member!.name, avatar_url: o.member!.avatar_url, term_start: o.term_start }));
  } catch {
    return [];
  }
}

export type MemberProfile = {
  member: DirectoryMember;
  current: ClubPlacement | null;
  lions_year: string;
  officerTerms: { id: string; role: string; scope_kind: string; term_start: string | null; term_end: string | null; status: string }[];
  activities: { id: string; title: string; date: string; hours: number }[];
};

export async function loadMemberProfile(viewer: Viewer, id: string): Promise<MemberProfile | null> {
  if (!viewer.signedIn || !isSupabaseConfigured()) return null;
  const db = await directoryDb();
  const { data: m } = await db
    .from('members')
    .select('id, name, avatar_url, lions_role, status, joined_at, club_id, lions_member_id, email, phone')
    .eq('id', id).is('deleted_at', null).maybeSingle();
  if (!m) return null;

  const [placements, { data: terms }, { data: logs }] = await Promise.all([
    loadClubPlacements(db, { includeDeleted: true }),
    db.from('officers').select('id, role, scope_kind, term_start, term_end, status')
      .eq('member_id', id).order('term_start', { ascending: false }),
    // Only activities this member is actually recorded against.
    db.from('volunteer_logs').select('hours, activity:activities(id, title, date)')
      .eq('member_id', id).not('activity_id', 'is', null).limit(50),
  ]);
  const clubs = new Map(placements.map((p) => [p.club_id, p]));

  type Log = { hours: number; activity: { id: string; title: string; date: string } | null };
  const byActivity = new Map<string, { id: string; title: string; date: string; hours: number }>();
  for (const l of (logs ?? []) as unknown as Log[]) {
    if (!l.activity) continue;
    const prev = byActivity.get(l.activity.id);
    byActivity.set(l.activity.id, { ...l.activity, hours: (prev?.hours ?? 0) + Number(l.hours || 0) });
  }

  return {
    member: toDirectoryMember(m as MemberRow, clubs, viewer),
    current: m.club_id ? clubs.get(m.club_id) ?? null : null,
    lions_year: currentLionsYear(),
    officerTerms: (terms ?? []) as MemberProfile['officerTerms'],
    activities: [...byActivity.values()].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
