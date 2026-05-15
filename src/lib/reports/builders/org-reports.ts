/** District / Multi-District / Lions International / SDG Impact. */
import type { ReportDoc, ReportFilters, ReportPeriod } from '../types';
import {
  fetchActivities, fetchDonations, fetchClubs, fetchDistricts,
  fetchMembersSnapshot, fetchVolunteerLogs, sumBy, groupBy,
} from '../aggregations';
import { PALETTE, SDG_COLORS } from '../brand';
import { emptyDoc, fmtINR, fmtInt, fmtShort } from './common';

export async function buildDistrictReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('district', 'District Performance Report', p, f);
  const [clubs, acts, members] = await Promise.all([fetchClubs(), fetchActivities(p, f), fetchMembersSnapshot()]);

  type Row = { name: string; activities: number; beneficiaries: number; hours: number; funds: number; members: number };
  const byClub = new Map<string, Row>();
  for (const c of clubs) byClub.set(c.id, { name: c.name, activities: 0, beneficiaries: 0, hours: 0, funds: 0, members: 0 });
  for (const a of acts) {
    if (!a.club_id) continue;
    const row = byClub.get(a.club_id);
    if (!row) continue;
    row.activities++;
    row.beneficiaries += a.beneficiaries ?? 0;
    row.hours += Number(a.service_hours ?? 0);
    row.funds += Number(a.amount_raised ?? 0);
  }
  for (const m of members) {
    if (!m.club_id) continue;
    const row = byClub.get(m.club_id); if (row) row.members++;
  }
  const rows = [...byClub.values()].sort((a, b) => b.activities - a.activities);

  const totBenef = rows.reduce((a, b) => a + b.beneficiaries, 0);
  const totHours = rows.reduce((a, b) => a + b.hours, 0);
  const totFunds = rows.reduce((a, b) => a + b.funds, 0);

  doc.kpis = [
    { label: 'Clubs in District',    value: fmtInt(clubs.length),  color: PALETTE[0] },
    { label: 'District Members',     value: fmtInt(members.length), color: PALETTE[1] },
    { label: 'District Activities',  value: fmtInt(acts.length),   color: PALETTE[2] },
    { label: 'District Beneficiaries', value: fmtInt(totBenef),    color: PALETTE[3] },
    { label: 'District Hours',       value: fmtInt(totHours),      color: PALETTE[4] },
    { label: 'District Funds',       value: fmtShort(totFunds),    color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'horizontal_bar', title: 'Activities by Club',
    labels: rows.slice(0, 12).map((r) => r.name),
    series: [{ name: 'Activities', data: rows.slice(0, 12).map((r) => r.activities) }],
  });
  doc.charts.push({
    kind: 'horizontal_bar', title: 'Beneficiaries by Club',
    labels: rows.slice(0, 12).map((r) => r.name),
    series: [{ name: 'Beneficiaries', data: rows.slice(0, 12).map((r) => r.beneficiaries) }],
  });
  doc.charts.push({
    kind: 'bar', title: 'Service Hours & Funds (Top Clubs)',
    labels: rows.slice(0, 8).map((r) => r.name),
    series: [
      { name: 'Hours', color: PALETTE[4], data: rows.slice(0, 8).map((r) => r.hours) },
      { name: 'Funds (K)', color: PALETTE[5], data: rows.slice(0, 8).map((r) => Math.round(r.funds / 1000)) },
    ],
  });

  doc.tables.push({
    title: 'Club Performance Matrix',
    columns: [
      { key: 'name', label: 'Club' },
      { key: 'members', label: 'Members', align: 'right' },
      { key: 'activities', label: 'Activities', align: 'right' },
      { key: 'beneficiaries', label: 'Beneficiaries', align: 'right' },
      { key: 'hours', label: 'Hours', align: 'right' },
      { key: 'funds', label: 'Funds', align: 'right' },
    ],
    rows: rows.map((r) => ({
      name: r.name, members: r.members, activities: r.activities,
      beneficiaries: fmtInt(r.beneficiaries), hours: fmtInt(r.hours), funds: fmtINR(r.funds),
    })),
    totals: { name: 'TOTAL', members: members.length, activities: acts.length,
      beneficiaries: fmtInt(totBenef), hours: fmtInt(totHours), funds: fmtINR(totFunds) },
  });

  doc.narrative.push({
    heading: 'District Snapshot',
    body:
      `The district hosts ${clubs.length} clubs with ${members.length} members. During ${p.label}, clubs collectively ` +
      `delivered ${acts.length} service projects, reaching ${fmtInt(totBenef)} beneficiaries through ${fmtInt(totHours)} ` +
      `service hours and ${fmtINR(totFunds)} in project funds.`,
  });
  return doc;
}

export async function buildMultiDistrictReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('multi_district', 'Multiple District Report', p, f);
  const [districts, clubs, acts, members] = await Promise.all([
    fetchDistricts(), fetchClubs(), fetchActivities(p, f), fetchMembersSnapshot(),
  ]);

  type Row = { name: string; code: string; clubs: number; members: number; activities: number; beneficiaries: number; funds: number };
  const map = new Map<string, Row>();
  for (const d of districts) map.set(d.id, { name: d.name, code: d.code, clubs: 0, members: 0, activities: 0, beneficiaries: 0, funds: 0 });
  for (const c of clubs) {
    const r = c.district_id ? map.get(c.district_id) : undefined;
    if (r) r.clubs++;
  }
  for (const m of members) {
    if (!m.district_id) continue;
    const r = map.get(m.district_id); if (r) r.members++;
  }
  const clubToDistrict = new Map(clubs.map((c) => [c.id, c.district_id]));
  for (const a of acts) {
    const did = a.club_id ? clubToDistrict.get(a.club_id) : undefined;
    if (!did) continue;
    const r = map.get(did); if (!r) continue;
    r.activities++;
    r.beneficiaries += a.beneficiaries ?? 0;
    r.funds += Number(a.amount_raised ?? 0);
  }
  const rows = [...map.values()].sort((a, b) => b.beneficiaries - a.beneficiaries);

  doc.kpis = [
    { label: 'Districts',     value: fmtInt(districts.length),                  color: PALETTE[0] },
    { label: 'Clubs',         value: fmtInt(clubs.length),                      color: PALETTE[1] },
    { label: 'Members',       value: fmtInt(members.length),                    color: PALETTE[2] },
    { label: 'Activities',    value: fmtInt(acts.length),                       color: PALETTE[3] },
    { label: 'Beneficiaries', value: fmtInt(rows.reduce((a, b) => a + b.beneficiaries, 0)), color: PALETTE[4] },
    { label: 'Funds',         value: fmtShort(rows.reduce((a, b) => a + b.funds, 0)), color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'horizontal_bar', title: 'Beneficiaries by District',
    labels: rows.map((r) => r.code),
    series: [{ name: 'Beneficiaries', data: rows.map((r) => r.beneficiaries) }],
  });
  doc.charts.push({
    kind: 'bar', title: 'Activities by District',
    labels: rows.map((r) => r.code),
    series: [{ name: 'Activities', data: rows.map((r) => r.activities), color: PALETTE[0] }],
  });

  doc.tables.push({
    title: 'District Roll-up',
    columns: [
      { key: 'code', label: 'District' },
      { key: 'name', label: 'Name' },
      { key: 'clubs', label: 'Clubs', align: 'right' },
      { key: 'members', label: 'Members', align: 'right' },
      { key: 'activities', label: 'Activities', align: 'right' },
      { key: 'beneficiaries', label: 'Beneficiaries', align: 'right' },
      { key: 'funds', label: 'Funds', align: 'right' },
    ],
    rows: rows.map((r) => ({
      code: r.code, name: r.name, clubs: r.clubs, members: r.members,
      activities: r.activities, beneficiaries: fmtInt(r.beneficiaries), funds: fmtINR(r.funds),
    })),
  });

  doc.narrative.push({
    heading: 'Multiple District Roll-up',
    body:
      `Across ${districts.length} districts and ${clubs.length} clubs, ${members.length} Lions delivered ${acts.length} ` +
      `projects reaching ${fmtInt(rows.reduce((a, b) => a + b.beneficiaries, 0))} beneficiaries during ${p.label}.`,
  });
  return doc;
}

export async function buildLionsInternationalReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('lions_international', 'Lions International Reporting Summary', p, f);
  const [acts, members, vols, dons] = await Promise.all([
    fetchActivities(p, f), fetchMembersSnapshot(), fetchVolunteerLogs(p, f), fetchDonations(p, f),
  ]);

  // Global causes mapping
  const causes = ['vision', 'diabetes', 'childhood_cancer', 'hunger', 'environment', 'humanitarian'];
  const causeStats = causes.map((c) => {
    const subset = acts.filter((a) => (a.category ?? '').toLowerCase() === c);
    return {
      cause: c,
      activities: subset.length,
      beneficiaries: subset.reduce((a, b) => a + (b.beneficiaries ?? 0), 0),
      hours: subset.reduce((a, b) => a + Number(b.service_hours ?? 0), 0),
    };
  });

  doc.kpis = [
    { label: 'Reportable Activities', value: fmtInt(acts.length),                                       color: PALETTE[0] },
    { label: 'Total Service Hours',   value: fmtInt(sumBy(vols, (v) => Number(v.hours))),               color: PALETTE[1] },
    { label: 'People Served',         value: fmtInt(sumBy(acts, (a) => a.beneficiaries ?? 0)),          color: PALETTE[2] },
    { label: 'Funds Raised',          value: fmtShort(sumBy(dons, (d) => Number(d.amount))),            color: PALETTE[3] },
    { label: 'Active Members',        value: fmtInt(members.filter((m) => m.status === 'active').length), color: PALETTE[4] },
    { label: 'Global Causes Touched', value: fmtInt(causeStats.filter((c) => c.activities > 0).length), color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'donut', title: 'Activities by Global Cause',
    labels: causeStats.map((c) => titleCase(c.cause)),
    series: [{ name: 'Activities', data: causeStats.map((c) => c.activities) }],
  });
  doc.charts.push({
    kind: 'horizontal_bar', title: 'Beneficiaries by Global Cause',
    labels: causeStats.map((c) => titleCase(c.cause)),
    series: [{ name: 'People', data: causeStats.map((c) => c.beneficiaries) }],
  });

  doc.tables.push({
    title: 'Lions International Service Report (MyLCI-compatible)',
    columns: [
      { key: 'cause', label: 'Global Cause' },
      { key: 'activities', label: 'Activities', align: 'right' },
      { key: 'beneficiaries', label: 'People Served', align: 'right' },
      { key: 'hours', label: 'Service Hours', align: 'right' },
    ],
    rows: causeStats.map((c) => ({
      cause: titleCase(c.cause),
      activities: c.activities,
      beneficiaries: fmtInt(c.beneficiaries),
      hours: fmtInt(c.hours),
    })),
    totals: {
      cause: 'TOTAL',
      activities: causeStats.reduce((a, b) => a + b.activities, 0),
      beneficiaries: fmtInt(causeStats.reduce((a, b) => a + b.beneficiaries, 0)),
      hours: fmtInt(causeStats.reduce((a, b) => a + b.hours, 0)),
    },
  });

  doc.narrative.push({
    heading: 'Lions International Submission',
    body:
      `This report consolidates the club's service contributions in a format compatible with Lions International MyLion / ` +
      `MyLCI reporting. All six Global Causes are tracked: Vision, Diabetes, Childhood Cancer, Hunger, Environment and ` +
      `Humanitarian. The club is in good standing with district reporting commitments for ${p.lionsYear}.`,
  });
  return doc;
}

export async function buildSDGImpactReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('sdg_impact', 'SDG Impact Report', p, f);
  const acts = await fetchActivities(p, f);

  const counts = new Map<number, { activities: number; beneficiaries: number; hours: number }>();
  for (const a of acts) {
    const codes: string[] = (a.sdg_codes as string[] | null) ?? [];
    for (const c of codes) {
      const n = Number(c.replace(/^SDG/i, ''));
      if (!n) continue;
      const cur = counts.get(n) ?? { activities: 0, beneficiaries: 0, hours: 0 };
      cur.activities++;
      cur.beneficiaries += a.beneficiaries ?? 0;
      cur.hours += Number(a.service_hours ?? 0);
      counts.set(n, cur);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => a[0] - b[0]);

  doc.kpis = [
    { label: 'SDGs Touched',         value: fmtInt(counts.size), color: PALETTE[0] },
    { label: 'Activities',           value: fmtInt(acts.length), color: PALETTE[1] },
    { label: 'Beneficiaries',        value: fmtInt(sumBy(acts, (a) => a.beneficiaries ?? 0)), color: PALETTE[2] },
    { label: 'Service Hours',        value: fmtInt(sumBy(acts, (a) => Number(a.service_hours ?? 0))), color: PALETTE[3] },
    { label: 'Top SDG (Activities)', value: sorted.sort((a, b) => b[1].activities - a[1].activities)[0] ? `SDG ${sorted[0][0]}` : '—', color: PALETTE[4] },
    { label: 'Top SDG (People)',     value: [...counts.entries()].sort((a, b) => b[1].beneficiaries - a[1].beneficiaries)[0] ? `SDG ${[...counts.entries()].sort((a, b) => b[1].beneficiaries - a[1].beneficiaries)[0][0]}` : '—', color: PALETTE[5] },
  ];

  const ordered = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  doc.charts.push({
    kind: 'bar', title: 'Activities Mapped to SDGs',
    labels: ordered.map(([n]) => `SDG ${n}`),
    series: [{ name: 'Activities', data: ordered.map(([, v]) => v.activities), color: PALETTE[0] }],
  });
  doc.charts.push({
    kind: 'horizontal_bar', title: 'Beneficiaries by SDG',
    labels: ordered.map(([n]) => `SDG ${n}`),
    series: [{ name: 'People', data: ordered.map(([, v]) => v.beneficiaries) }],
  });

  doc.tables.push({
    title: 'SDG Coverage Matrix',
    columns: [
      { key: 'sdg', label: 'SDG' },
      { key: 'activities', label: 'Activities', align: 'right' },
      { key: 'beneficiaries', label: 'Beneficiaries', align: 'right' },
      { key: 'hours', label: 'Hours', align: 'right' },
    ],
    rows: ordered.map(([n, v]) => ({
      sdg: `SDG ${n}`, activities: v.activities, beneficiaries: fmtInt(v.beneficiaries), hours: fmtInt(v.hours),
    })),
  });

  doc.narrative.push({
    heading: 'Alignment with United Nations SDGs',
    body:
      `The club's portfolio touched ${counts.size} of the 17 UN Sustainable Development Goals during ${p.label}. ` +
      `This SDG framing strengthens the club's CSR pitch with corporate partners and aligns local service with the ` +
      `global agenda.`,
  });
  void SDG_COLORS;
  return doc;
}

function titleCase(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
