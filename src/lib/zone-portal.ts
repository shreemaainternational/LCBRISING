/**
 * Zone Chairperson portal helpers — resolve the logged-in chair's
 * zone, aggregate clubs / members / activities / donations etc.
 * scoped to that zone, and compute the club performance scores +
 * alerts shown on the dashboard.
 */
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export interface ZoneContext {
  zone: {
    id: string;
    code: string;
    name: string;
    chairperson_name: string | null;
    chairperson_member_id: string | null;
    district_id: string;
    region_id: string | null;
  };
  district: { id: string; code: string; name: string | null } | null;
  region: { id: string; code: string; name: string | null } | null;
  member: { id: string; user_id: string | null; name: string; email: string; role: string };
}

const ZONE_ROLES = new Set(['zone_chairperson', 'region_chairperson', 'district_governor', 'admin']);

/**
 * Returns the zone the current user is authorised to view.
 * Resolution order:
 *   1. zones.chairperson_member_id matches the current member
 *   2. The current member has a lions_role of zone_chairperson and is
 *      attached to a club whose zone we can derive
 *   3. The member is admin / district_governor → returns the first
 *      zone in their district (for super-admin convenience)
 * Returns null if no claim succeeds.
 */
export async function getZoneContext(): Promise<ZoneContext | null> {
  const member = await getCurrentMember();
  if (!member) return null;

  const db = createAdminClient();

  // 1. Direct zone chair link
  const { data: ownedZone } = await db.from('zones')
    .select('id, code, name, chairperson_name, chairperson_member_id, district_id, region_id')
    .eq('chairperson_member_id', member.id)
    .is('deleted_at', null)
    .maybeSingle();
  let zone = ownedZone;

  // 2. lions_role + member.club_id → derive zone from club
  if (!zone && member.club_id) {
    const { data: club } = await db.from('clubs').select('zone_id').eq('id', member.club_id).maybeSingle();
    if (club?.zone_id) {
      const { data } = await db.from('zones')
        .select('id, code, name, chairperson_name, chairperson_member_id, district_id, region_id')
        .eq('id', club.zone_id).maybeSingle();
      zone = data ?? null;
    }
  }

  // 3. Admin / district governor fallback: first zone of their district
  const adminLike = member.role === 'admin' || (member as { lions_role?: string }).lions_role === 'district_governor';
  if (!zone && adminLike) {
    let q = db.from('zones')
      .select('id, code, name, chairperson_name, chairperson_member_id, district_id, region_id')
      .is('deleted_at', null);
    if (member.district_id) q = q.eq('district_id', member.district_id);
    const { data } = await q.order('code').limit(1).maybeSingle();
    zone = data ?? null;
  }

  if (!zone) return null;

  const [{ data: district }, { data: region }] = await Promise.all([
    db.from('districts').select('id, code, name').eq('id', zone.district_id).maybeSingle(),
    zone.region_id ? db.from('regions').select('id, code, name').eq('id', zone.region_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return {
    zone,
    district: district ?? null,
    region: (region as { id: string; code: string; name: string | null } | null) ?? null,
    member: {
      id: member.id,
      user_id: member.user_id,
      name: member.name,
      email: member.email,
      role: member.role,
    },
  };
}

/** Guard for zone-portal pages — redirects unauthorized users. */
export async function requireZoneChair(): Promise<ZoneContext> {
  const member = await getCurrentMember();
  if (!member) redirect('/zone/login');
  const lionsRole = (member as { lions_role?: string }).lions_role;
  // permissive: admins and district governors can also view
  if (!ZONE_ROLES.has(lionsRole ?? '') && member.role !== 'admin' && member.role !== 'president') {
    redirect('/zone/login?denied=role');
  }
  const ctx = await getZoneContext();
  if (!ctx) redirect('/zone/login?denied=no_zone');
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Aggregations                                                       */
/* ------------------------------------------------------------------ */

export interface ZoneKpis {
  clubs: number;
  members: number;
  activities: number;
  volunteerHours: number;
  fundsRaised: number;
  beneficiaries: number;
}

export interface ClubScore {
  id: string;
  name: string;
  club_number: string | null;
  members: number;
  activities: number;
  attendancePct: number;
  score: number;
}

export interface ZoneAlert {
  id: string;
  level: 'warning' | 'critical' | 'info';
  clubId: string | null;
  clubName: string | null;
  title: string;
  body: string;
  action: string;
}

export async function getZoneKpis(zoneId: string): Promise<{ kpis: ZoneKpis; clubIds: string[] }> {
  const db = createAdminClient();
  const { data: clubs } = await db.from('clubs')
    .select('id').eq('zone_id', zoneId).is('deleted_at', null);
  const clubIds = (clubs ?? []).map((c) => c.id);

  if (!clubIds.length) {
    return {
      kpis: { clubs: 0, members: 0, activities: 0, volunteerHours: 0, fundsRaised: 0, beneficiaries: 0 },
      clubIds: [],
    };
  }

  const [
    { count: memberCount },
    { data: acts },
    { data: dons },
    { data: vols },
  ] = await Promise.all([
    db.from('members').select('*', { count: 'exact', head: true })
      .in('club_id', clubIds).is('deleted_at', null),
    db.from('activities').select('beneficiaries, amount_raised, sponsorship_amount, service_hours')
      .in('club_id', clubIds),
    db.from('donations').select('amount').in('club_id', clubIds).is('payment_id', null).limit(1)
      .then(() => db.from('donations').select('amount, payment_id, created_at')), // donations don't have club_id; total chapter
    db.from('volunteer_logs').select('hours, member_id'),
  ]);

  const beneficiaries = (acts ?? []).reduce((a, b) => a + (b.beneficiaries ?? 0), 0);
  const activityFunds = (acts ?? []).reduce((a, b) => a + Number(b.amount_raised ?? 0) + Number(b.sponsorship_amount ?? 0), 0);
  const donationFunds = (dons ?? []).reduce((a, b) => a + Number(b.amount), 0);
  const volunteerHours = Math.round(
    (vols ?? []).reduce((a, b) => a + Number(b.hours ?? 0), 0)
    + (acts ?? []).reduce((a, b) => a + Number(b.service_hours ?? 0), 0),
  );

  return {
    kpis: {
      clubs: clubIds.length,
      members: memberCount ?? 0,
      activities: (acts ?? []).length,
      volunteerHours,
      fundsRaised: activityFunds + donationFunds,
      beneficiaries,
    },
    clubIds,
  };
}

export async function getClubScores(zoneId: string): Promise<ClubScore[]> {
  const db = createAdminClient();
  const { data: clubs } = await db.from('clubs')
    .select('id, name, club_number')
    .eq('zone_id', zoneId).is('deleted_at', null).order('name');
  if (!clubs?.length) return [];
  const ids = clubs.map((c) => c.id);

  const [{ data: members }, { data: acts }, { data: attendance }] = await Promise.all([
    db.from('members').select('id, club_id').in('club_id', ids).is('deleted_at', null),
    db.from('activities').select('id, club_id').in('club_id', ids),
    db.from('attendance').select('member_id, status, occurred_at').gte('occurred_at',
      new Date(Date.now() - 60 * 86400_000).toISOString()),
  ]);

  const memberByClub = new Map<string, string[]>();
  for (const m of members ?? []) {
    const arr = memberByClub.get(m.club_id!) ?? [];
    arr.push(m.id);
    memberByClub.set(m.club_id!, arr);
  }
  const memberToClub = new Map<string, string>();
  for (const m of members ?? []) memberToClub.set(m.id, m.club_id!);

  const attByClub = new Map<string, { present: number; total: number }>();
  for (const a of attendance ?? []) {
    const club = memberToClub.get(a.member_id);
    if (!club) continue;
    const cur = attByClub.get(club) ?? { present: 0, total: 0 };
    cur.total++;
    if (a.status === 'present' || a.status === 'remote') cur.present++;
    attByClub.set(club, cur);
  }

  const actByClub = new Map<string, number>();
  for (const a of acts ?? []) actByClub.set(a.club_id!, (actByClub.get(a.club_id!) ?? 0) + 1);

  const rows = clubs.map((c) => {
    const ms = memberByClub.get(c.id)?.length ?? 0;
    const at = attByClub.get(c.id) ?? { present: 0, total: 0 };
    const attendancePct = at.total ? Math.round((at.present / at.total) * 100) : 0;
    const activities = actByClub.get(c.id) ?? 0;
    // Score: 50% attendance, 30% activity volume (normalised /20), 20% size
    const score = Math.round(
      attendancePct * 0.5
      + Math.min(100, activities * 5) * 0.3
      + Math.min(100, ms * 2) * 0.2,
    );
    return {
      id: c.id, name: c.name, club_number: c.club_number,
      members: ms, activities, attendancePct, score,
    };
  });

  rows.sort((a, b) => b.score - a.score);
  return rows;
}

export async function getZoneAlerts(zoneId: string, clubScores: ClubScore[]): Promise<ZoneAlert[]> {
  const db = createAdminClient();
  const out: ZoneAlert[] = [];

  for (const c of clubScores) {
    if (c.attendancePct < 20) {
      out.push({
        id: `att-${c.id}`,
        level: 'warning',
        clubId: c.id,
        clubName: c.name,
        title: c.name,
        body: `${c.name} has low attendance (${c.attendancePct}%)`,
        action: 'Review attendance and send advisory',
      });
    }
    if (c.activities === 0) {
      out.push({
        id: `act-${c.id}`,
        level: 'warning',
        clubId: c.id,
        clubName: c.name,
        title: c.name,
        body: `${c.name} has not logged any activity this period`,
        action: 'Nudge club to file activities',
      });
    }
  }

  // Open advisories
  const { data: openAdv } = await db.from('advisories')
    .select('id, club_id, subject, body, action_required, priority, clubs(name)')
    .eq('zone_id', zoneId).eq('status', 'open').order('created_at', { ascending: false }).limit(5);
  for (const a of openAdv ?? []) {
    out.push({
      id: a.id,
      level: a.priority === 'critical' ? 'critical' : a.priority === 'warning' ? 'warning' : 'info',
      clubId: a.club_id,
      clubName: (a.clubs as { name?: string } | null)?.name ?? null,
      title: a.subject,
      body: a.body,
      action: a.action_required ?? 'Open and follow up',
    });
  }

  return out.slice(0, 8);
}
