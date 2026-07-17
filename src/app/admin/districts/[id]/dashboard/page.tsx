import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { DistrictDashboard, type DistrictDashData } from '@/components/admin/DistrictDashboard';

export const dynamic = 'force-dynamic';

/** Lions fiscal year runs Jul 1 – Jun 30. */
function fyStartIso(now: Date): string {
  const y = now.getFullYear();
  const start = now.getMonth() >= 6 ? y : y - 1;
  return new Date(Date.UTC(start, 6, 1)).toISOString();
}

/** Last 12 month buckets, oldest → newest, keyed "MMM YY". */
function monthBuckets(now: Date): { key: string; year: number; month: number }[] {
  const out: { key: string; year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() });
  }
  return out;
}

export default async function DistrictDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const now = new Date();
  const fyStart = fyStartIso(now);

  const { data: district } = await db.from('districts').select('id, code, name').eq('id', id).maybeSingle();
  if (!district) notFound();

  // District → clubs → members/activities; plus region & zone counts.
  const [{ data: clubs }, { count: regionCount }, { count: zoneCount }, zonesRes] = await Promise.all([
    db.from('clubs').select('id, name, club_number, city, zone_id, region_id').eq('district_id', id).is('deleted_at', null).order('name'),
    db.from('regions').select('id', { count: 'exact', head: true }).eq('district_id', id).is('deleted_at', null),
    db.from('zones').select('id', { count: 'exact', head: true }).eq('district_id', id).is('deleted_at', null),
    db.from('zones').select('id, name').eq('district_id', id).is('deleted_at', null),
  ]);

  const clubList = clubs ?? [];
  const clubIds = clubList.map((c) => c.id);
  const zoneName = new Map((zonesRes.data ?? []).map((z) => [z.id as string, z.name as string]));

  // Members in the district: linked by district_id OR belonging to a club in it.
  const orFilter = clubIds.length
    ? `district_id.eq.${id},club_id.in.(${clubIds.join(',')})`
    : `district_id.eq.${id}`;
  const [{ data: members }, { data: activities }, { data: donations }, { count: officerCount }] = await Promise.all([
    db.from('members').select('id, status, club_id, joined_at').or(orFilter).is('deleted_at', null),
    clubIds.length
      ? db.from('activities').select('category, beneficiaries, service_hours, amount_raised, date, club_id').in('club_id', clubIds)
      : Promise.resolve({ data: [] as { category: string | null; beneficiaries: number; service_hours: number; amount_raised: number; date: string; club_id: string | null }[] }),
    db.from('donations').select('amount, donor_email, created_at'),
    db.from('officers').select('id', { count: 'exact', head: true }).eq('scope_kind', 'club').in('scope_id', clubIds.length ? clubIds : ['00000000-0000-0000-0000-000000000000']).eq('status', 'active'),
  ]);

  const memberList = members ?? [];
  const actList = activities ?? [];
  const donList = donations ?? [];
  const buckets = monthBuckets(now);

  // ---- Membership KPIs + monthly totals (cumulative to each month end).
  const statusCount = (s: string) => memberList.filter((m) => m.status === s).length;
  const membersAddedFY = memberList.filter((m) => m.joined_at && new Date(m.joined_at) >= new Date(fyStart)).length;
  const membershipByMonth = buckets.map((b) => {
    const end = new Date(b.year, b.month + 1, 1).getTime();
    const total = memberList.filter((m) => !m.joined_at || new Date(m.joined_at).getTime() < end).length;
    const added = memberList.filter((m) => {
      if (!m.joined_at) return false;
      const d = new Date(m.joined_at);
      return d.getFullYear() === b.year && d.getMonth() === b.month;
    }).length;
    return { month: b.key, total, added };
  });

  // ---- Members by club + clubs by zone.
  const membersByClubMap = new Map<string, number>();
  for (const m of memberList) if (m.club_id) membersByClubMap.set(m.club_id, (membersByClubMap.get(m.club_id) ?? 0) + 1);
  const membersByClub = clubList
    .map((c) => ({ name: c.name as string, value: membersByClubMap.get(c.id) ?? 0 }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const zoneAgg = new Map<string, { clubs: number; members: number }>();
  for (const c of clubList) {
    const zn = c.zone_id ? zoneName.get(c.zone_id) ?? 'Unzoned' : 'Unzoned';
    const cur = zoneAgg.get(zn) ?? { clubs: 0, members: 0 };
    cur.clubs += 1;
    cur.members += membersByClubMap.get(c.id) ?? 0;
    zoneAgg.set(zn, cur);
  }
  const clubsByZone = Array.from(zoneAgg.entries()).map(([zone, v]) => ({ zone, ...v })).sort((a, b) => b.clubs - a.clubs);

  // ---- Activities (FY) KPIs + breakdowns.
  const actFY = actList.filter((a) => new Date(a.date) >= new Date(fyStart));
  const peopleServed = actFY.reduce((s, a) => s + Number(a.beneficiaries ?? 0), 0);
  const serviceHours = Math.round(actFY.reduce((s, a) => s + Number(a.service_hours ?? 0), 0));
  const fundsRaised = actFY.reduce((s, a) => s + Number(a.amount_raised ?? 0), 0);

  const catMap = new Map<string, { count: number; beneficiaries: number }>();
  for (const a of actFY) {
    const cat = (a.category ?? 'other').replace(/_/g, ' ');
    const cur = catMap.get(cat) ?? { count: 0, beneficiaries: 0 };
    cur.count += 1; cur.beneficiaries += Number(a.beneficiaries ?? 0);
    catMap.set(cat, cur);
  }
  const activitiesByCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, ...v })).sort((a, b) => b.count - a.count).slice(0, 10);

  const activitiesByMonth = buckets.map((b) => ({
    month: b.key,
    count: actList.filter((a) => {
      const d = new Date(a.date);
      return d.getFullYear() === b.year && d.getMonth() === b.month;
    }).length,
  }));

  // ---- Donations (chapter-wide; not club-attributed).
  const donationsByMonth = buckets.map((b) => ({
    month: b.key,
    amount: donList.filter((d) => {
      const dt = new Date(d.created_at);
      return dt.getFullYear() === b.year && dt.getMonth() === b.month;
    }).reduce((s, d) => s + Number(d.amount ?? 0), 0),
  }));
  const donFY = donList.filter((d) => new Date(d.created_at) >= new Date(fyStart));
  const donationKpis = {
    totalFY: donFY.reduce((s, d) => s + Number(d.amount ?? 0), 0),
    donorCountFY: new Set(donFY.map((d) => (d.donor_email ?? '').toLowerCase()).filter(Boolean)).size,
  };

  const data: DistrictDashData = {
    districtName: district.name as string,
    districtCode: district.code as string,
    asOf: now.toLocaleString('en-IN'),
    kpis: {
      totalMembers: memberList.length,
      active: statusCount('active'), lapsed: statusCount('lapsed'), pending: statusCount('pending'), suspended: statusCount('suspended'),
      totalClubs: clubList.length, totalZones: zoneCount ?? 0, totalRegions: regionCount ?? 0,
      activitiesFY: actFY.length, peopleServed, serviceHours, fundsRaised,
      membersAddedFY, totalOfficers: officerCount ?? 0,
    },
    membershipByMonth, membersByClub, clubsByZone, activitiesByCategory, activitiesByMonth,
    clubs: clubList.map((c) => ({
      id: c.id as string, name: c.name as string, club_number: (c.club_number as string | null) ?? null,
      zone: c.zone_id ? zoneName.get(c.zone_id) ?? '—' : '—',
      members: membersByClubMap.get(c.id) ?? 0, city: (c.city as string | null) ?? null,
    })),
    donationsByMonth, donationKpis,
  };

  return (
    <div>
      <Link href={`/admin/districts/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800 mb-3">
        <ArrowLeft size={14} /> Back to {district.code}
      </Link>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">District {district.code} — Dashboard</h1>
      <p className="text-gray-600 mb-6">Live analytics across this district&rsquo;s regions, zones, clubs and members.</p>
      <DistrictDashboard data={data} />
    </div>
  );
}
