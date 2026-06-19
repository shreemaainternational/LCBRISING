/**
 * Period-rollup reports: monthly / quarterly / half-yearly / yearly.
 * All use the same template; the period drives the analysis depth.
 */
import type { ReportDoc, ReportFilters, ReportPeriod, ReportType } from '../types';
import {
  fetchActivities, fetchDonations, fetchMembersSnapshot, fetchVolunteerLogs,
  fetchEvents, fetchBeneficiaries, fetchAwards, sumBy, topN,
} from '../aggregations';
import { previousPeriod, monthBucketsBetween, pctDelta } from '../period';
import { PALETTE, SDG_COLORS } from '../brand';
import { emptyDoc, fmtINR, fmtInt, fmtShort } from './common';

interface PeriodOpts {
  type: Extract<ReportType, 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'>;
  title: string;
}

export async function buildPeriodReport(
  opts: PeriodOpts,
  period: ReportPeriod,
  filters: ReportFilters,
): Promise<ReportDoc> {
  const doc = emptyDoc(opts.type, opts.title, period, filters);
  const prev = previousPeriod(period);

  const [acts, prevActs, dons, prevDons, members, vols, events, benes, awards] = await Promise.all([
    fetchActivities(period, filters),
    fetchActivities(prev, filters),
    fetchDonations(period, filters),
    fetchDonations(prev, filters),
    fetchMembersSnapshot(),
    fetchVolunteerLogs(period, filters),
    fetchEvents(period),
    fetchBeneficiaries(),
    fetchAwards(period.lionsYear),
  ]);

  const beneficiaries = sumBy(acts, (a) => a.beneficiaries ?? 0);
  const prevBeneficiaries = sumBy(prevActs, (a) => a.beneficiaries ?? 0);
  const hours = sumBy(vols, (v) => v.hours) || sumBy(acts, (a) => a.service_hours ?? 0);
  const lionsParticipated = sumBy(acts, (a) => a.lion_members_count ?? 0);
  const leos = sumBy(acts, (a) => a.leo_members_count ?? 0);
  const donationTotal = sumBy(dons, (d) => Number(d.amount));
  const prevDonationTotal = sumBy(prevDons, (d) => Number(d.amount));
  const csrTotal = sumBy(acts, (a) => Number(a.sponsorship_amount ?? 0));
  const fundsRaised = donationTotal + csrTotal + sumBy(acts, (a) => Number(a.amount_raised ?? 0));
  const totalExpenses = sumBy(acts, (a) => Number(a.expenses ?? 0));
  const activeMembers = members.filter((m) => m.status === 'active').length;

  doc.kpis = [
    { label: 'Activities',         value: fmtInt(acts.length),       delta: pctDelta(acts.length, prevActs.length), color: PALETTE[0] },
    { label: 'Beneficiaries',      value: fmtInt(beneficiaries),     delta: pctDelta(beneficiaries, prevBeneficiaries), color: PALETTE[1] },
    { label: 'Lion Members Engaged', value: fmtInt(lionsParticipated), color: PALETTE[2] },
    { label: 'Leo Members',        value: fmtInt(leos),              color: PALETTE[3] },
    { label: 'Volunteer Hours',    value: fmtInt(hours),             color: PALETTE[4] },
    { label: 'Funds Raised',       value: fmtShort(fundsRaised),     delta: pctDelta(donationTotal, prevDonationTotal), color: PALETTE[5] },
    { label: 'CSR Sponsorship',    value: fmtShort(csrTotal),        color: PALETTE[6] },
    { label: 'Expenses',           value: fmtShort(totalExpenses),   color: PALETTE[7] },
    { label: 'Events Held',        value: fmtInt(events.length),     color: PALETTE[8] },
    { label: 'Active Members',     value: fmtInt(activeMembers),     color: PALETTE[9] },
    { label: 'Beneficiary CRM',    value: fmtInt(benes.length),      color: PALETTE[10] },
    { label: 'Awards (Year)',      value: fmtInt(awards.length),     color: PALETTE[11] },
  ];

  // Monthly trend across the period
  const buckets = monthBucketsBetween(period.start, period.end);
  const monthLabel = (d: Date) =>
    `${d.toLocaleString('en-IN', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`;
  const monthlyActivities = buckets.map(() => 0);
  const monthlyBeneficiaries = buckets.map(() => 0);
  const monthlyHours = buckets.map(() => 0);
  const monthlyFunds = buckets.map(() => 0);
  for (const a of acts) {
    const d = new Date(a.date);
    const idx = buckets.findIndex((b) => b.date.getMonth() === d.getMonth() && b.date.getFullYear() === d.getFullYear());
    if (idx >= 0) {
      monthlyActivities[idx]++;
      monthlyBeneficiaries[idx] += a.beneficiaries ?? 0;
      monthlyHours[idx] += Number(a.service_hours ?? 0);
      monthlyFunds[idx] += Number(a.amount_raised ?? 0) + Number(a.sponsorship_amount ?? 0);
    }
  }
  for (const d of dons) {
    const dt = new Date(d.created_at);
    const idx = buckets.findIndex((b) => b.date.getMonth() === dt.getMonth() && b.date.getFullYear() === dt.getFullYear());
    if (idx >= 0) monthlyFunds[idx] += Number(d.amount);
  }

  doc.charts.push({
    kind: 'line',
    title: 'Activity Cadence (per month)',
    labels: buckets.map((b) => monthLabel(b.date)),
    series: [{ name: 'Activities', data: monthlyActivities, color: PALETTE[0] }],
  });
  doc.charts.push({
    kind: 'area',
    title: 'Beneficiaries Reached',
    labels: buckets.map((b) => monthLabel(b.date)),
    series: [{ name: 'Beneficiaries', data: monthlyBeneficiaries, color: PALETTE[1] }],
  });
  doc.charts.push({
    kind: 'bar',
    title: 'Volunteer Hours',
    labels: buckets.map((b) => monthLabel(b.date)),
    series: [{ name: 'Hours', data: monthlyHours, color: PALETTE[4] }],
  });
  doc.charts.push({
    kind: 'area',
    title: 'Funds Mobilised',
    labels: buckets.map((b) => monthLabel(b.date)),
    series: [{ name: 'INR', data: monthlyFunds, color: PALETTE[5] }],
  });

  // Service category breakdown
  const byCat = new Map<string, { count: number; beneficiaries: number; hours: number }>();
  for (const a of acts) {
    const key = (a.category ?? 'other').toString();
    const cur = byCat.get(key) ?? { count: 0, beneficiaries: 0, hours: 0 };
    cur.count++;
    cur.beneficiaries += a.beneficiaries ?? 0;
    cur.hours += Number(a.service_hours ?? 0);
    byCat.set(key, cur);
  }
  const catEntries = [...byCat.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10);

  if (catEntries.length) {
    doc.charts.push({
      kind: 'donut',
      title: 'Activities by Service Category',
      labels: catEntries.map(([k]) => titleCase(k)),
      series: [{ name: 'Activities', data: catEntries.map(([, v]) => v.count) }],
    });
    doc.charts.push({
      kind: 'horizontal_bar',
      title: 'Beneficiaries by Service Category',
      labels: catEntries.map(([k]) => titleCase(k)),
      series: [{ name: 'Beneficiaries', data: catEntries.map(([, v]) => v.beneficiaries) }],
    });
  }

  // Top projects
  const top = topN(acts, 8, (a) => (a.beneficiaries ?? 0) * 2 + Number(a.amount_raised ?? 0) / 1000);
  if (top.length) {
    doc.tables.push({
      title: 'Top Service Projects',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'title', label: 'Project' },
        { key: 'category', label: 'Category' },
        { key: 'beneficiaries', label: 'Beneficiaries', align: 'right' },
        { key: 'service_hours', label: 'Hours', align: 'right' },
        { key: 'amount_raised', label: 'Funds (INR)', align: 'right' },
      ],
      rows: top.map((a) => ({
        date: new Date(a.date).toLocaleDateString('en-IN'),
        title: a.title,
        category: titleCase(a.category ?? '—'),
        beneficiaries: fmtInt(a.beneficiaries ?? 0),
        service_hours: fmtInt(a.service_hours ?? 0),
        amount_raised: fmtINR(Number(a.amount_raised ?? 0)),
      })),
    });
  }

  // Donations top list
  const topDons = topN(dons, 8, (d) => Number(d.amount));
  if (topDons.length) {
    doc.tables.push({
      title: 'Top Donations',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'donor', label: 'Donor' },
        { key: 'campaign', label: 'Campaign' },
        { key: 'amount', label: 'Amount', align: 'right' },
      ],
      rows: topDons.map((d) => ({
        date: new Date(d.created_at).toLocaleDateString('en-IN'),
        donor: d.is_anonymous ? 'Anonymous' : d.donor_name,
        campaign: d.campaign ?? '—',
        amount: fmtINR(Number(d.amount)),
      })),
      totals: { date: '', donor: 'TOTAL', campaign: '', amount: fmtINR(donationTotal) },
    });
  }

  // SDG impact mini
  const sdgCounts = new Map<number, number>();
  for (const a of acts) {
    const codes: string[] = (a.sdg_codes as string[] | null) ?? [];
    for (const c of codes) {
      const n = Number(c.replace(/^SDG/i, ''));
      if (n) sdgCounts.set(n, (sdgCounts.get(n) ?? 0) + 1);
    }
  }
  if (sdgCounts.size) {
    const sorted = [...sdgCounts.entries()].sort((a, b) => b[1] - a[1]);
    doc.charts.push({
      kind: 'bar',
      title: 'SDG Impact Distribution',
      labels: sorted.map(([n]) => `SDG ${n}`),
      series: [{ name: 'Activities', data: sorted.map(([, v]) => v) }],
    });
    // patch colors by SDG
    const last = doc.charts[doc.charts.length - 1];
    last.series[0].data.forEach((_v) => {
      /* visual variety via per-bar colors not currently supported; series color suffices */
    });
    void SDG_COLORS;
  }

  // Narrative
  doc.narrative.push({
    heading: 'Executive Summary',
    body:
      `During ${period.label}, Lions Club of Baroda Rising Star delivered ${acts.length} service projects, ` +
      `directly impacting ${fmtInt(beneficiaries)} beneficiaries. Members contributed ${fmtInt(hours)} volunteer hours ` +
      `across vision, healthcare, hunger relief, education and environmental causes. The club mobilised ${fmtINR(fundsRaised)} ` +
      `in funds, including ${fmtINR(csrTotal)} from CSR partnerships, demonstrating sustained engagement with the community ` +
      `and Lions International's global causes.`,
  });
  if (top[0]) {
    doc.narrative.push({
      heading: 'Flagship Project',
      body:
        `"${top[0].title}" (${new Date(top[0].date).toLocaleDateString('en-IN')}) emerged as the period's flagship project ` +
        `with ${fmtInt(top[0].beneficiaries ?? 0)} beneficiaries served and ${fmtINR(Number(top[0].amount_raised ?? 0))} raised. ` +
        `${top[0].description ?? ''}`,
    });
  }
  doc.narrative.push({
    heading: 'Membership & Engagement',
    body:
      `The club currently has ${activeMembers} active members. ${lionsParticipated} Lion participations and ${leos} Leo ` +
      `participations were recorded across events, with a healthy participation rate sustaining the club's operational ` +
      `capacity. Notable awards earned during the Lions Year: ${awards.length}.`,
  });
  doc.narrative.push({
    heading: 'Outlook',
    body:
      `Activity volume changed by ${pctDelta(acts.length, prevActs.length)} versus the previous comparable period; ` +
      `donations changed by ${pctDelta(donationTotal, prevDonationTotal)}. Continued focus on Lions International's ` +
      `Global Causes — Vision, Diabetes, Childhood Cancer, Hunger, Environment and Humanitarian — alongside deeper ` +
      `district reporting, will compound the club's impact in the coming period.`,
  });

  doc.totals = {
    activities: acts.length,
    beneficiaries,
    hours,
    funds_raised: fundsRaised,
    donations: donationTotal,
    csr: csrTotal,
    expenses: totalExpenses,
  };

  return doc;
}

function titleCase(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
