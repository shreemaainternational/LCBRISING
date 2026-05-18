/**
 * Region Chairperson portal — resolves the chair's region and
 * aggregates clubs / members / activities across every zone within
 * that region.
 */
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export interface RegionContext {
  region: { id: string; code: string; name: string; chairperson_member_id: string | null; district_id: string };
  district: { id: string; code: string; name: string | null } | null;
  member: { id: string; user_id: string | null; name: string; email: string; role: string };
}

export async function getRegionContext(): Promise<RegionContext | null> {
  const member = await getCurrentMember();
  if (!member) return null;
  const db = createAdminClient();

  const { data: owned } = await db.from('regions')
    .select('id, code, name, chairperson_member_id, district_id')
    .eq('chairperson_member_id', member.id)
    .is('deleted_at', null)
    .maybeSingle();
  let region = owned;

  const adminLike = member.role === 'admin' || (member as { lions_role?: string }).lions_role === 'district_governor';
  if (!region && adminLike) {
    let q = db.from('regions')
      .select('id, code, name, chairperson_member_id, district_id')
      .is('deleted_at', null);
    if (member.district_id) q = q.eq('district_id', member.district_id);
    const { data } = await q.order('code').limit(1).maybeSingle();
    region = data ?? null;
  }
  if (!region) return null;

  const { data: district } = await db.from('districts').select('id, code, name').eq('id', region.district_id).maybeSingle();
  return {
    region,
    district: district ?? null,
    member: {
      id: member.id, user_id: member.user_id, name: member.name,
      email: member.email, role: member.role,
    },
  };
}

export async function requireRegionChair(): Promise<RegionContext> {
  const member = await getCurrentMember();
  if (!member) redirect('/region/login');
  const lionsRole = (member as { lions_role?: string }).lions_role;
  if (lionsRole !== 'region_chairperson' && lionsRole !== 'district_governor' && member.role !== 'admin' && member.role !== 'president') {
    redirect('/region/login?denied=role');
  }
  const ctx = await getRegionContext();
  if (!ctx) redirect('/region/login?denied=no_region');
  return ctx;
}

export interface RegionKpis {
  zones: number;
  clubs: number;
  members: number;
  activities: number;
  volunteerHours: number;
  fundsRaised: number;
  beneficiaries: number;
}

export interface ZoneScore {
  id: string;
  code: string;
  name: string;
  clubs: number;
  members: number;
  activities: number;
  attendancePct: number;
  score: number;
}

export async function getRegionKpis(regionId: string): Promise<RegionKpis & { zoneIds: string[] }> {
  const db = createAdminClient();
  const { data: zones } = await db.from('zones').select('id').eq('region_id', regionId).is('deleted_at', null);
  const zoneIds = (zones ?? []).map((z) => z.id);
  if (!zoneIds.length) {
    return { zones: 0, clubs: 0, members: 0, activities: 0, volunteerHours: 0, fundsRaised: 0, beneficiaries: 0, zoneIds: [] };
  }
  const { data: clubs } = await db.from('clubs').select('id').in('zone_id', zoneIds).is('deleted_at', null);
  const clubIds = (clubs ?? []).map((c) => c.id);
  if (!clubIds.length) {
    return { zones: zoneIds.length, clubs: 0, members: 0, activities: 0, volunteerHours: 0, fundsRaised: 0, beneficiaries: 0, zoneIds };
  }

  const [{ count: memberCount }, { data: acts }, { data: dons }, { data: vols }] = await Promise.all([
    db.from('members').select('*', { count: 'exact', head: true }).in('club_id', clubIds).is('deleted_at', null),
    db.from('activities').select('beneficiaries, amount_raised, sponsorship_amount, service_hours').in('club_id', clubIds),
    db.from('donations').select('amount'),
    db.from('volunteer_logs').select('hours'),
  ]);

  return {
    zones: zoneIds.length,
    clubs: clubIds.length,
    members: memberCount ?? 0,
    activities: (acts ?? []).length,
    volunteerHours: Math.round(
      (vols ?? []).reduce((a, b) => a + Number(b.hours ?? 0), 0)
      + (acts ?? []).reduce((a, b) => a + Number(b.service_hours ?? 0), 0),
    ),
    fundsRaised:
      (acts ?? []).reduce((a, b) => a + Number(b.amount_raised ?? 0) + Number(b.sponsorship_amount ?? 0), 0)
      + (dons ?? []).reduce((a, b) => a + Number(b.amount), 0),
    beneficiaries: (acts ?? []).reduce((a, b) => a + (b.beneficiaries ?? 0), 0),
    zoneIds,
  };
}

export async function getZoneScores(regionId: string): Promise<ZoneScore[]> {
  const db = createAdminClient();
  const { data: zones } = await db.from('zones')
    .select('id, code, name')
    .eq('region_id', regionId).is('deleted_at', null).order('code');
  if (!zones?.length) return [];
  const zoneIds = zones.map((z) => z.id);
  const { data: clubs } = await db.from('clubs').select('id, zone_id').in('zone_id', zoneIds).is('deleted_at', null);
  const clubsByZone = new Map<string, string[]>();
  for (const c of clubs ?? []) {
    const arr = clubsByZone.get(c.zone_id!) ?? [];
    arr.push(c.id); clubsByZone.set(c.zone_id!, arr);
  }
  const { data: members } = await db.from('members').select('id, club_id').is('deleted_at', null);
  const { data: acts } = await db.from('activities').select('club_id');
  const { data: attendance } = await db.from('attendance')
    .select('member_id, status, occurred_at')
    .gte('occurred_at', new Date(Date.now() - 60 * 86400_000).toISOString());

  const clubToZone = new Map<string, string>();
  for (const c of clubs ?? []) if (c.zone_id) clubToZone.set(c.id, c.zone_id);
  const memberToZone = new Map<string, string>();
  for (const m of members ?? []) {
    const z = m.club_id ? clubToZone.get(m.club_id) : null;
    if (z) memberToZone.set(m.id, z);
  }

  const memberByZone = new Map<string, number>();
  for (const m of members ?? []) {
    const z = m.club_id ? clubToZone.get(m.club_id) : null;
    if (z) memberByZone.set(z, (memberByZone.get(z) ?? 0) + 1);
  }
  const actByZone = new Map<string, number>();
  for (const a of acts ?? []) {
    const z = a.club_id ? clubToZone.get(a.club_id) : null;
    if (z) actByZone.set(z, (actByZone.get(z) ?? 0) + 1);
  }
  const attByZone = new Map<string, { present: number; total: number }>();
  for (const a of attendance ?? []) {
    const z = memberToZone.get(a.member_id);
    if (!z) continue;
    const cur = attByZone.get(z) ?? { present: 0, total: 0 };
    cur.total++;
    if (a.status === 'present' || a.status === 'remote') cur.present++;
    attByZone.set(z, cur);
  }

  const rows = zones.map((z) => {
    const ms = memberByZone.get(z.id) ?? 0;
    const at = attByZone.get(z.id) ?? { present: 0, total: 0 };
    const attendancePct = at.total ? Math.round((at.present / at.total) * 100) : 0;
    const activities = actByZone.get(z.id) ?? 0;
    const score = Math.round(
      attendancePct * 0.5
      + Math.min(100, activities * 3) * 0.3
      + Math.min(100, ms * 1.5) * 0.2,
    );
    return { id: z.id, code: z.code, name: z.name, clubs: clubsByZone.get(z.id)?.length ?? 0, members: ms, activities, attendancePct, score };
  });
  rows.sort((a, b) => b.score - a.score);
  return rows;
}
