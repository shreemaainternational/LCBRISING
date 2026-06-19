/** Beneficiary, Volunteer, Membership, Award, Club Growth. */
import type { ReportDoc, ReportFilters, ReportPeriod } from '../types';
import {
  fetchBeneficiaries, fetchBeneficiaryServices, fetchVolunteerLogs,
  fetchMembersSnapshot, fetchAwards, fetchClubs, sumBy, groupBy,
} from '../aggregations';
import { monthBucketsBetween } from '../period';
import { PALETTE } from '../brand';
import { emptyDoc, fmtINR, fmtInt, fmtShort } from './common';

export async function buildBeneficiaryReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('beneficiary', 'Beneficiary Impact Report', p, f);
  const [benes, svcs] = await Promise.all([fetchBeneficiaries(), fetchBeneficiaryServices(p)]);

  const inPeriod = new Set(svcs.map((s) => s.beneficiary_id));
  const reachedInPeriod = inPeriod.size;
  const repeat = benes.filter((b) => (b.total_services_received ?? 0) > 1).length;
  const female = benes.filter((b) => b.gender === 'female').length;
  const male = benes.filter((b) => b.gender === 'male').length;

  const ageBuckets = { '0-12': 0, '13-25': 0, '26-45': 0, '46-65': 0, '65+': 0 };
  for (const b of benes) {
    const age = b.age ?? 0;
    if (age <= 12) ageBuckets['0-12']++;
    else if (age <= 25) ageBuckets['13-25']++;
    else if (age <= 45) ageBuckets['26-45']++;
    else if (age <= 65) ageBuckets['46-65']++;
    else ageBuckets['65+']++;
  }

  const cityMap = new Map<string, number>();
  for (const b of benes) cityMap.set(b.city ?? 'Unknown', (cityMap.get(b.city ?? 'Unknown') ?? 0) + 1);
  const cities = [...cityMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  doc.kpis = [
    { label: 'Beneficiary Records', value: fmtInt(benes.length), color: PALETTE[0] },
    { label: 'Reached in Period',   value: fmtInt(reachedInPeriod), color: PALETTE[1] },
    { label: 'Repeat Beneficiaries',value: fmtInt(repeat),       color: PALETTE[2] },
    { label: 'Services Logged',     value: fmtInt(svcs.length),  color: PALETTE[3] },
    { label: 'Female',              value: fmtInt(female),       color: PALETTE[4] },
    { label: 'Male',                value: fmtInt(male),         color: PALETTE[5] },
    { label: 'Cities Reached',      value: fmtInt(cityMap.size), color: PALETTE[6] },
    { label: 'Value Delivered',     value: fmtShort(sumBy(svcs, (s) => Number(s.value_provided ?? 0))), color: PALETTE[7] },
  ];

  doc.charts.push({
    kind: 'donut', title: 'Gender Distribution',
    labels: ['Female', 'Male', 'Other / Undisclosed'],
    series: [{ name: 'People', data: [female, male, benes.length - female - male] }],
  });
  doc.charts.push({
    kind: 'bar', title: 'Age Distribution',
    labels: Object.keys(ageBuckets),
    series: [{ name: 'People', data: Object.values(ageBuckets), color: PALETTE[1] }],
  });
  doc.charts.push({
    kind: 'horizontal_bar', title: 'Top Cities Reached',
    labels: cities.map(([c]) => c),
    series: [{ name: 'Beneficiaries', data: cities.map(([, v]) => v) }],
  });

  doc.tables.push({
    title: 'Recent Service Records',
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'service', label: 'Service' },
      { key: 'value', label: 'Value', align: 'right' },
      { key: 'follow', label: 'Follow-up?' },
    ],
    rows: svcs.slice(0, 25).map((s) => ({
      date: new Date(s.service_date).toLocaleDateString('en-IN'),
      service: s.service_type ?? '—',
      value: fmtINR(Number(s.value_provided ?? 0)),
      follow: s.follow_up_required ? 'Yes' : 'No',
    })),
  });

  doc.narrative.push({
    heading: 'Beneficiary Reach',
    body:
      `The club's beneficiary CRM holds ${fmtInt(benes.length)} records. In ${p.label}, ${fmtInt(reachedInPeriod)} ` +
      `unique beneficiaries received services worth ${fmtINR(sumBy(svcs, (s) => Number(s.value_provided ?? 0)))}. ` +
      `${fmtInt(repeat)} beneficiaries are repeat recipients across the lifetime of the club.`,
  });
  return doc;
}

export async function buildVolunteerReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('volunteer', 'Volunteer & Lion Hours Report', p, f);
  const [vols, members] = await Promise.all([fetchVolunteerLogs(p, f), fetchMembersSnapshot()]);

  const totalHours = sumBy(vols, (v) => Number(v.hours));
  const byMember = new Map<string, { name: string; hours: number; count: number }>();
  for (const v of vols) {
    const cur = byMember.get(v.member_id) ?? { name: v.members?.name ?? 'Member', hours: 0, count: 0 };
    cur.hours += Number(v.hours);
    cur.count++;
    byMember.set(v.member_id, cur);
  }
  const ranked = [...byMember.values()].sort((a, b) => b.hours - a.hours);

  doc.kpis = [
    { label: 'Total Volunteer Hours', value: fmtInt(totalHours),       color: PALETTE[0] },
    { label: 'Active Volunteers',     value: fmtInt(byMember.size),    color: PALETTE[1] },
    { label: 'Log Entries',           value: fmtInt(vols.length),      color: PALETTE[2] },
    { label: 'Avg Hours / Volunteer', value: fmtInt(byMember.size ? totalHours / byMember.size : 0), color: PALETTE[3] },
    { label: 'Top Contributor',       value: ranked[0]?.name ?? '—',   color: PALETTE[4] },
    { label: 'Total Members',         value: fmtInt(members.filter((m) => m.status === 'active').length), color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'horizontal_bar', title: 'Hours Leaderboard (Top 12)',
    labels: ranked.slice(0, 12).map((r) => r.name),
    series: [{ name: 'Hours', data: ranked.slice(0, 12).map((r) => r.hours) }],
  });

  const buckets = monthBucketsBetween(p.start, p.end);
  const monthHours = buckets.map(() => 0);
  for (const v of vols) {
    const d = new Date(v.logged_for_date);
    const i = buckets.findIndex((b) => b.date.getMonth() === d.getMonth() && b.date.getFullYear() === d.getFullYear());
    if (i >= 0) monthHours[i] += Number(v.hours);
  }
  doc.charts.push({
    kind: 'area', title: 'Volunteer Hours Trend',
    labels: buckets.map((b) => b.key),
    series: [{ name: 'Hours', data: monthHours, color: PALETTE[2] }],
  });

  doc.tables.push({
    title: 'Volunteer Leaderboard',
    columns: [
      { key: 'name', label: 'Volunteer' },
      { key: 'count', label: 'Activities', align: 'right' },
      { key: 'hours', label: 'Hours', align: 'right' },
    ],
    rows: ranked.slice(0, 30).map((r) => ({ name: r.name, count: r.count, hours: fmtInt(r.hours) })),
    totals: { name: 'TOTAL', count: vols.length, hours: fmtInt(totalHours) },
  });

  doc.narrative.push({
    heading: 'Service Hours',
    body:
      `Members logged ${fmtInt(totalHours)} volunteer hours across ${vols.length} entries during ${p.label}. ` +
      `${ranked[0]?.name ?? '—'} led the leaderboard with ${fmtInt(ranked[0]?.hours ?? 0)} hours. ` +
      `${byMember.size} members were actively engaged out of ${members.filter((m) => m.status === 'active').length} active.`,
  });
  return doc;
}

export async function buildMembershipReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('membership', 'Membership Report', p, f);
  const members = await fetchMembersSnapshot();

  const active = members.filter((m) => m.status === 'active').length;
  const lapsed = members.filter((m) => m.status === 'lapsed').length;
  const pending = members.filter((m) => m.status === 'pending').length;
  const suspended = members.filter((m) => m.status === 'suspended').length;

  const joinedInPeriod = members.filter((m) => {
    const j = m.joined_at ? new Date(m.joined_at) : null;
    return j && j >= p.start && j <= p.end;
  });

  // Tenure
  const tenure = { '<1 yr': 0, '1-3 yr': 0, '3-5 yr': 0, '5-10 yr': 0, '10+ yr': 0 };
  const now = Date.now();
  for (const m of members) {
    if (!m.joined_at) continue;
    const yrs = (now - new Date(m.joined_at).getTime()) / (365.25 * 86400000);
    if (yrs < 1) tenure['<1 yr']++;
    else if (yrs < 3) tenure['1-3 yr']++;
    else if (yrs < 5) tenure['3-5 yr']++;
    else if (yrs < 10) tenure['5-10 yr']++;
    else tenure['10+ yr']++;
  }

  doc.kpis = [
    { label: 'Total Members',  value: fmtInt(members.length), color: PALETTE[0] },
    { label: 'Active',         value: fmtInt(active),         color: PALETTE[2] },
    { label: 'Pending',        value: fmtInt(pending),        color: PALETTE[6] },
    { label: 'Lapsed',         value: fmtInt(lapsed),         color: PALETTE[3] },
    { label: 'Suspended',      value: fmtInt(suspended),      color: PALETTE[7] },
    { label: 'Joined in Period', value: fmtInt(joinedInPeriod.length), color: PALETTE[1] },
  ];

  doc.charts.push({
    kind: 'donut', title: 'Status Distribution',
    labels: ['Active', 'Pending', 'Lapsed', 'Suspended'],
    series: [{ name: 'Members', data: [active, pending, lapsed, suspended] }],
  });
  doc.charts.push({
    kind: 'bar', title: 'Tenure Distribution',
    labels: Object.keys(tenure),
    series: [{ name: 'Members', data: Object.values(tenure), color: PALETTE[4] }],
  });

  doc.tables.push({
    title: 'New Members in Period',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'joined', label: 'Joined' },
      { key: 'status', label: 'Status' },
    ],
    rows: joinedInPeriod.map((m) => ({
      name: m.name, email: m.email, role: m.role,
      joined: m.joined_at ? new Date(m.joined_at).toLocaleDateString('en-IN') : '—',
      status: m.status,
    })),
  });

  doc.narrative.push({
    heading: 'Membership Health',
    body:
      `The club currently has ${members.length} members on record: ${active} active, ${pending} pending, ${lapsed} lapsed, ` +
      `${suspended} suspended. ${joinedInPeriod.length} new members joined during ${p.label}.`,
  });
  return doc;
}

export async function buildAwardReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('award_qualification', 'Award Qualification Report', p, f);
  const awards = await fetchAwards(p.lionsYear);

  const tiers = groupBy(awards, (a) => a.tier);
  const statuses = groupBy(awards, (a) => a.status);

  doc.kpis = [
    { label: 'Awards Tracked',  value: fmtInt(awards.length), color: PALETTE[0] },
    { label: 'Awarded',         value: fmtInt(awards.filter((a) => a.status === 'awarded').length), color: PALETTE[2] },
    { label: 'Pending',         value: fmtInt(awards.filter((a) => a.status === 'pending').length), color: PALETTE[6] },
    { label: 'Qualified',       value: fmtInt(awards.filter((a) => a.status === 'qualified').length), color: PALETTE[1] },
    { label: 'Tiers Active',    value: fmtInt(tiers.size), color: PALETTE[4] },
    { label: 'Lions Year',      value: p.lionsYear, color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'bar', title: 'Awards by Tier',
    labels: [...tiers.keys()].map(humanizeTier),
    series: [{ name: 'Count', data: [...tiers.values()].map((arr) => arr.length), color: PALETTE[0] }],
  });
  doc.charts.push({
    kind: 'pie', title: 'Status Mix',
    labels: [...statuses.keys()],
    series: [{ name: 'Count', data: [...statuses.values()].map((arr) => arr.length) }],
  });

  doc.tables.push({
    title: 'Award Register',
    columns: [
      { key: 'name', label: 'Award' },
      { key: 'tier', label: 'Tier' },
      { key: 'member', label: 'Member' },
      { key: 'club', label: 'Club' },
      { key: 'status', label: 'Status' },
      { key: 'awarded', label: 'Awarded On' },
    ],
    rows: awards.map((a) => ({
      name: a.award_name,
      tier: humanizeTier(a.tier),
      member: (a.members as { name?: string })?.name ?? '—',
      club: (a.clubs as { name?: string })?.name ?? '—',
      status: a.status,
      awarded: a.awarded_on ? new Date(a.awarded_on).toLocaleDateString('en-IN') : '—',
    })),
  });

  doc.narrative.push({
    heading: 'Recognition',
    body:
      `${awards.length} award qualifications were tracked for Lions Year ${p.lionsYear}, including MJF / PMJF, club ` +
      `excellence, presidential, governor's appreciation, leadership, service and membership-growth tiers. ` +
      `${awards.filter((a) => a.status === 'awarded').length} have been formally awarded.`,
  });
  return doc;
}

export async function buildClubGrowthReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('club_growth', 'Club Growth Report', p, f);
  const [members, clubs] = await Promise.all([fetchMembersSnapshot(), fetchClubs()]);

  // Net growth over last 12 months
  const labels: string[] = [];
  const joined: number[] = [];
  const lapsed: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const ref = new Date();
    ref.setMonth(ref.getMonth() - i);
    const ym = `${ref.toLocaleString('en-IN', { month: 'short' })} ${String(ref.getFullYear()).slice(2)}`;
    labels.push(ym);
    joined.push(members.filter((m) => m.joined_at && sameYM(new Date(m.joined_at), ref)).length);
    lapsed.push(members.filter((m) => m.status === 'lapsed' && m.updated_at && sameYM(new Date(m.updated_at), ref)).length);
  }
  const net = joined.map((j, i) => j - lapsed[i]);

  doc.kpis = [
    { label: 'Total Members',    value: fmtInt(members.length), color: PALETTE[0] },
    { label: 'Active Members',   value: fmtInt(members.filter((m) => m.status === 'active').length), color: PALETTE[2] },
    { label: 'YTD Joins',        value: fmtInt(joined.reduce((a, b) => a + b, 0)), color: PALETTE[1] },
    { label: 'YTD Lapses',       value: fmtInt(lapsed.reduce((a, b) => a + b, 0)), color: PALETTE[3] },
    { label: 'YTD Net Growth',   value: fmtInt(net.reduce((a, b) => a + b, 0)), color: PALETTE[4] },
    { label: 'Clubs Registered', value: fmtInt(clubs.length), color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'line', title: 'Membership Movement (Last 12 mo)',
    labels,
    series: [
      { name: 'Joined', color: PALETTE[2], data: joined },
      { name: 'Lapsed', color: PALETTE[3], data: lapsed },
      { name: 'Net',    color: PALETTE[0], data: net },
    ],
  });

  doc.charts.push({
    kind: 'bar', title: 'Members by Role',
    labels: ['Admin', 'President', 'Secretary', 'Treasurer', 'Officer', 'Member'],
    series: [{ name: 'Count', color: PALETTE[1], data: [
      members.filter((m) => m.role === 'admin').length,
      members.filter((m) => m.role === 'president').length,
      members.filter((m) => m.role === 'secretary').length,
      members.filter((m) => m.role === 'treasurer').length,
      members.filter((m) => m.role === 'officer').length,
      members.filter((m) => m.role === 'member').length,
    ] }],
  });

  doc.narrative.push({
    heading: 'Growth Outlook',
    body:
      `Net membership growth over the last twelve months: ${net.reduce((a, b) => a + b, 0)}. ` +
      `Total active strength stands at ${members.filter((m) => m.status === 'active').length}. ` +
      `${clubs.length} clubs are registered in the federation tree.`,
  });
  return doc;
}

function humanizeTier(t: string): string {
  const map: Record<string, string> = {
    mjf: 'Melvin Jones Fellow',
    pmjf: 'Progressive MJF',
    club_excellence: 'Club Excellence',
    presidential: 'Presidential',
    governor_appreciation: "Governor's Appreciation",
    leadership: 'Leadership',
    service: 'Service',
    membership_growth: 'Membership Growth',
    centennial: 'Centennial',
  };
  return map[t] ?? t;
}

function sameYM(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
