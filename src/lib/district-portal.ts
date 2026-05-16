/**
 * District Governor portal — resolves the active DG's district and
 * rolls KPIs up across every region / zone / club in it.
 */
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export interface DistrictContext {
  district: { id: string; code: string; name: string; governor_name: string | null; lions_year: string | null; multiple_district_id: string | null };
  multipleDistrict: { id: string; code: string; name: string } | null;
  member: { id: string; user_id: string | null; name: string; email: string; role: string };
}

export async function getDistrictContext(): Promise<DistrictContext | null> {
  const member = await getCurrentMember();
  if (!member) return null;

  const db = createAdminClient();

  // 1. Direct DG link
  const { data: owned } = await db.from('districts')
    .select('id, code, name, governor_name, lions_year, multiple_district_id')
    .eq('governor_member_id', member.id)
    .is('deleted_at', null)
    .maybeSingle();
  let district = owned;

  // 2. Admin fallback — first district they belong to
  const adminLike = member.role === 'admin' || (member as { lions_role?: string }).lions_role === 'district_governor';
  if (!district && adminLike) {
    let q = db.from('districts')
      .select('id, code, name, governor_name, lions_year, multiple_district_id')
      .is('deleted_at', null);
    if (member.district_id) q = q.eq('id', member.district_id);
    const { data } = await q.order('code').limit(1).maybeSingle();
    district = data ?? null;
  }
  if (!district) return null;

  let md = null;
  if (district.multiple_district_id) {
    const { data } = await db.from('multiple_districts')
      .select('id, code, name').eq('id', district.multiple_district_id).maybeSingle();
    md = data ?? null;
  }

  return {
    district,
    multipleDistrict: md,
    member: {
      id: member.id, user_id: member.user_id,
      name: member.name, email: member.email, role: member.role,
    },
  };
}

export async function requireDistrictGovernor(): Promise<DistrictContext> {
  const member = await getCurrentMember();
  if (!member) redirect('/district/login');
  const lionsRole = (member as { lions_role?: string }).lions_role;
  if (lionsRole !== 'district_governor' && lionsRole !== 'multiple_district_admin'
      && member.role !== 'admin' && member.role !== 'president') {
    redirect('/district/login?denied=role');
  }
  const ctx = await getDistrictContext();
  if (!ctx) redirect('/district/login?denied=no_district');
  return ctx;
}

export interface DistrictKpis {
  regions: number;
  zones: number;
  clubs: number;
  members: number;
  activities: number;
  volunteerHours: number;
  fundsRaised: number;
  beneficiaries: number;
  criticalClubs: number;
}

export interface RegionRollup {
  id: string;
  code: string;
  name: string;
  zones: number;
  clubs: number;
  members: number;
  activities: number;
  avgHealth: number | null;
}

export async function getDistrictKpis(districtId: string): Promise<DistrictKpis> {
  const db = createAdminClient();

  const [{ data: regions }, { data: zones }, { data: clubs }] = await Promise.all([
    db.from('regions').select('id').eq('district_id', districtId).is('deleted_at', null),
    db.from('zones').select('id').eq('district_id', districtId).is('deleted_at', null),
    db.from('clubs').select('id, health_score').eq('district_id', districtId).is('deleted_at', null),
  ]);
  const clubIds = (clubs ?? []).map((c) => c.id);
  if (!clubIds.length) {
    return {
      regions: regions?.length ?? 0, zones: zones?.length ?? 0,
      clubs: 0, members: 0, activities: 0, volunteerHours: 0,
      fundsRaised: 0, beneficiaries: 0, criticalClubs: 0,
    };
  }

  const [{ count: memberCount }, { data: acts }, { data: dons }, { data: vols }] = await Promise.all([
    db.from('members').select('*', { count: 'exact', head: true })
      .in('club_id', clubIds).is('deleted_at', null),
    db.from('activities')
      .select('beneficiaries, amount_raised, sponsorship_amount, service_hours')
      .in('club_id', clubIds),
    db.from('donations').select('amount'),
    db.from('volunteer_logs').select('hours'),
  ]);

  const criticalClubs = (clubs ?? []).filter((c) => (c.health_score ?? 100) < 30).length;
  const fundsActivity = (acts ?? []).reduce((a, b) =>
    a + Number(b.amount_raised ?? 0) + Number(b.sponsorship_amount ?? 0), 0);
  const fundsDonations = (dons ?? []).reduce((a, b) => a + Number(b.amount ?? 0), 0);
  const volunteerHours = Math.round(
    (vols ?? []).reduce((a, b) => a + Number(b.hours ?? 0), 0)
    + (acts ?? []).reduce((a, b) => a + Number(b.service_hours ?? 0), 0),
  );

  return {
    regions: regions?.length ?? 0,
    zones: zones?.length ?? 0,
    clubs: clubIds.length,
    members: memberCount ?? 0,
    activities: (acts ?? []).length,
    volunteerHours,
    fundsRaised: fundsActivity + fundsDonations,
    beneficiaries: (acts ?? []).reduce((a, b) => a + (b.beneficiaries ?? 0), 0),
    criticalClubs,
  };
}

export async function getRegionRollups(districtId: string): Promise<RegionRollup[]> {
  const db = createAdminClient();
  const { data: regions } = await db.from('regions')
    .select('id, code, name')
    .eq('district_id', districtId).is('deleted_at', null).order('code');
  if (!regions?.length) return [];

  const { data: zones } = await db.from('zones')
    .select('id, region_id').in('region_id', regions.map((r) => r.id)).is('deleted_at', null);
  const { data: clubs } = await db.from('clubs')
    .select('id, zone_id, district_id, region_id, health_score')
    .eq('district_id', districtId).is('deleted_at', null);
  const { data: members } = await db.from('members').select('id, club_id').is('deleted_at', null);
  const { data: acts } = await db.from('activities').select('club_id');

  const clubsByRegion = new Map<string, string[]>();
  const memberByClub = new Map<string, number>();
  for (const m of members ?? []) {
    if (m.club_id) memberByClub.set(m.club_id, (memberByClub.get(m.club_id) ?? 0) + 1);
  }

  return regions.map((r) => {
    const regionZones = (zones ?? []).filter((z) => z.region_id === r.id).map((z) => z.id);
    const regionClubs = (clubs ?? []).filter((c) => c.region_id === r.id || (c.zone_id && regionZones.includes(c.zone_id)));
    clubsByRegion.set(r.id, regionClubs.map((c) => c.id));
    const members = regionClubs.reduce((a, c) => a + (memberByClub.get(c.id) ?? 0), 0);
    const activities = (acts ?? []).filter((a) => a.club_id && regionClubs.some((c) => c.id === a.club_id)).length;
    const scored = regionClubs.filter((c) => c.health_score != null);
    const avgHealth = scored.length
      ? Math.round(scored.reduce((a, b) => a + (b.health_score as number), 0) / scored.length)
      : null;
    return {
      id: r.id, code: r.code, name: r.name,
      zones: regionZones.length, clubs: regionClubs.length,
      members, activities, avgHealth,
    };
  });
}
