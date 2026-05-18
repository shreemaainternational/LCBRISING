/**
 * Multiple-District (MD) Council portal — tops the hierarchy.
 * Rolls KPIs up across every district / region / zone / club.
 */
import { redirect } from 'next/navigation';
import { getCurrentMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export interface MultiDistrictContext {
  md: { id: string; code: string; name: string; country: string; council_chairperson_name: string | null };
  member: { id: string; user_id: string | null; name: string; email: string; role: string };
}

export async function getMdContext(): Promise<MultiDistrictContext | null> {
  const member = await getCurrentMember();
  if (!member) return null;
  const db = createAdminClient();

  const { data: owned } = await db.from('multiple_districts')
    .select('id, code, name, country, council_chairperson_name')
    .eq('council_chairperson_member_id', member.id)
    .is('deleted_at', null)
    .maybeSingle();
  let md = owned;

  const adminLike = member.role === 'admin' || (member as { lions_role?: string }).lions_role === 'multiple_district_admin';
  if (!md && adminLike) {
    const { data } = await db.from('multiple_districts')
      .select('id, code, name, country, council_chairperson_name')
      .is('deleted_at', null).order('code').limit(1).maybeSingle();
    md = data ?? null;
  }
  if (!md) return null;

  return {
    md,
    member: {
      id: member.id, user_id: member.user_id,
      name: member.name, email: member.email, role: member.role,
    },
  };
}

export async function requireMdChair(): Promise<MultiDistrictContext> {
  const member = await getCurrentMember();
  if (!member) redirect('/multi-district/login');
  const lionsRole = (member as { lions_role?: string }).lions_role;
  if (lionsRole !== 'multiple_district_admin' && lionsRole !== 'international_admin'
      && member.role !== 'admin' && member.role !== 'president') {
    redirect('/multi-district/login?denied=role');
  }
  const ctx = await getMdContext();
  if (!ctx) redirect('/multi-district/login?denied=no_md');
  return ctx;
}

export interface MdKpis {
  districts: number;
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

export interface DistrictRollup {
  id: string;
  code: string;
  name: string;
  governor_name: string | null;
  regions: number;
  zones: number;
  clubs: number;
  members: number;
  activities: number;
  avgHealth: number | null;
}

export async function getMdKpis(mdId: string): Promise<MdKpis> {
  const db = createAdminClient();
  const { data: districts } = await db.from('districts')
    .select('id').eq('multiple_district_id', mdId).is('deleted_at', null);
  const districtIds = (districts ?? []).map((d) => d.id);
  if (!districtIds.length) {
    return { districts: 0, regions: 0, zones: 0, clubs: 0, members: 0,
      activities: 0, volunteerHours: 0, fundsRaised: 0, beneficiaries: 0, criticalClubs: 0 };
  }

  const [{ data: regions }, { data: zones }, { data: clubs }] = await Promise.all([
    db.from('regions').select('id').in('district_id', districtIds).is('deleted_at', null),
    db.from('zones').select('id').in('district_id', districtIds).is('deleted_at', null),
    db.from('clubs').select('id, health_score').in('district_id', districtIds).is('deleted_at', null),
  ]);
  const clubIds = (clubs ?? []).map((c) => c.id);

  const [{ count: memberCount }, { data: acts }, { data: dons }, { data: vols }] = await Promise.all([
    clubIds.length ? db.from('members').select('*', { count: 'exact', head: true }).in('club_id', clubIds).is('deleted_at', null) : { count: 0 },
    clubIds.length ? db.from('activities').select('beneficiaries, amount_raised, sponsorship_amount, service_hours').in('club_id', clubIds) : { data: [] },
    db.from('donations').select('amount'),
    db.from('volunteer_logs').select('hours'),
  ]);

  return {
    districts: districtIds.length,
    regions: regions?.length ?? 0,
    zones: zones?.length ?? 0,
    clubs: clubIds.length,
    members: memberCount ?? 0,
    activities: (acts ?? []).length,
    volunteerHours: Math.round(
      (vols ?? []).reduce((a, b) => a + Number(b.hours ?? 0), 0) +
      (acts ?? []).reduce((a, b) => a + Number(b.service_hours ?? 0), 0),
    ),
    fundsRaised:
      (acts ?? []).reduce((a, b) => a + Number(b.amount_raised ?? 0) + Number(b.sponsorship_amount ?? 0), 0) +
      (dons ?? []).reduce((a, b) => a + Number(b.amount ?? 0), 0),
    beneficiaries: (acts ?? []).reduce((a, b) => a + (b.beneficiaries ?? 0), 0),
    criticalClubs: (clubs ?? []).filter((c) => (c.health_score ?? 100) < 30).length,
  };
}

export async function getDistrictRollups(mdId: string): Promise<DistrictRollup[]> {
  const db = createAdminClient();
  const { data: districts } = await db.from('districts')
    .select('id, code, name, governor_name')
    .eq('multiple_district_id', mdId).is('deleted_at', null).order('code');
  if (!districts?.length) return [];

  const districtIds = districts.map((d) => d.id);
  const [{ data: regions }, { data: zones }, { data: clubs }, { data: members }, { data: acts }] = await Promise.all([
    db.from('regions').select('id, district_id').in('district_id', districtIds).is('deleted_at', null),
    db.from('zones').select('id, district_id').in('district_id', districtIds).is('deleted_at', null),
    db.from('clubs').select('id, district_id, health_score').in('district_id', districtIds).is('deleted_at', null),
    db.from('members').select('club_id').is('deleted_at', null),
    db.from('activities').select('club_id'),
  ]);

  const clubToDistrict = new Map((clubs ?? []).map((c) => [c.id, c.district_id]));

  return districts.map((d) => {
    const dRegions = (regions ?? []).filter((r) => r.district_id === d.id).length;
    const dZones = (zones ?? []).filter((z) => z.district_id === d.id).length;
    const dClubs = (clubs ?? []).filter((c) => c.district_id === d.id);
    const dMembers = (members ?? []).filter((m) => m.club_id && clubToDistrict.get(m.club_id) === d.id).length;
    const dActs = (acts ?? []).filter((a) => a.club_id && clubToDistrict.get(a.club_id) === d.id).length;
    const scored = dClubs.filter((c) => c.health_score != null);
    const avgHealth = scored.length
      ? Math.round(scored.reduce((a, b) => a + (b.health_score as number), 0) / scored.length)
      : null;
    return {
      id: d.id, code: d.code, name: d.name, governor_name: d.governor_name,
      regions: dRegions, zones: dZones, clubs: dClubs.length,
      members: dMembers, activities: dActs, avgHealth,
    };
  });
}
