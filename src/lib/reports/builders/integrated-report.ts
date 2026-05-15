/**
 * Integrated 360° report — cross-references every entity in the CRM
 * (clubs, members, activities, beneficiaries, donations, dues, events,
 * volunteer logs, CSR partners, awards, SDGs, payments) into a single
 * easy-to-read "everything in one place" document.
 *
 * The goal is to give a reader the full picture of how the data fits
 * together without bouncing between 20 different report types.
 */
import type { ReportDoc, ReportFilters, ReportPeriod } from '../types';
import {
  fetchActivities, fetchDonations, fetchDues, fetchMembersSnapshot,
  fetchEvents, fetchBeneficiaries, fetchBeneficiaryServices,
  fetchVolunteerLogs, fetchCSRPartners, fetchAwards, fetchClubs,
  fetchPayments, sumBy, topN, db,
} from '../aggregations';
import { monthBucketsBetween, pctDelta, previousPeriod } from '../period';
import { PALETTE } from '../brand';
import { emptyDoc, fmtINR, fmtInt, fmtShort } from './common';

export async function buildIntegratedReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc(
    'monthly', // reuses generic shell; type label is suppressed in UI
    `Integrated Operations Report — ${p.label}`,
    p, f,
  );
  doc.subtitle = 'A single, joined view of every CRM entity for the period.';

  const prev = previousPeriod(p);
  const [
    acts, prevActs, dons, prevDons, dues, payments, members, events,
    benes, benesSvc, vols, csrs, awards, clubs,
  ] = await Promise.all([
    fetchActivities(p, f), fetchActivities(prev, f),
    fetchDonations(p, f), fetchDonations(prev, f),
    fetchDues(p), fetchPayments(p), fetchMembersSnapshot(),
    fetchEvents(p), fetchBeneficiaries(), fetchBeneficiaryServices(p),
    fetchVolunteerLogs(p, f), fetchCSRPartners(), fetchAwards(p.lionsYear),
    fetchClubs(),
  ]);

  // -- Cross-entity rollups --------------------------------------------
  const beneficiaries = sumBy(acts, (a) => a.beneficiaries ?? 0);
  const hours = sumBy(vols, (v) => Number(v.hours)) || sumBy(acts, (a) => Number(a.service_hours ?? 0));
  const donationTotal = sumBy(dons, (d) => Number(d.amount));
  const csrTotal = sumBy(acts, (a) => Number(a.sponsorship_amount ?? 0));
  const duesCollected = sumBy(dues.filter((d) => d.status === 'paid'), (d) => Number(d.amount));
  const duesPending = sumBy(dues.filter((d) => d.status !== 'paid'), (d) => Number(d.amount));
  const projectFunds = sumBy(acts, (a) => Number(a.amount_raised ?? 0));
  const expenses = sumBy(acts, (a) => Number(a.expenses ?? 0));
  const budget = sumBy(acts, (a) => Number(a.budget ?? 0));
  const inflows = donationTotal + csrTotal + duesCollected + projectFunds;

  const activeMembers = members.filter((m) => m.status === 'active').length;
  const captured = payments.filter((p) => p.status === 'captured').length;

  const benesReached = new Set(benesSvc.map((s) => s.beneficiary_id)).size;
  const valueDelivered = sumBy(benesSvc, (s) => Number(s.value_provided ?? 0));

  // -- KPIs ------------------------------------------------------------
  doc.kpis = [
    { label: 'Activities',       value: fmtInt(acts.length),       delta: pctDelta(acts.length, prevActs.length), color: PALETTE[0] },
    { label: 'Beneficiaries',    value: fmtInt(beneficiaries),     color: PALETTE[1] },
    { label: 'Volunteer Hours',  value: fmtInt(hours),             color: PALETTE[2] },
    { label: 'Events',           value: fmtInt(events.length),     color: PALETTE[3] },
    { label: 'Donations',        value: fmtShort(donationTotal),   delta: pctDelta(donationTotal, sumBy(prevDons, (d) => Number(d.amount))), color: PALETTE[4] },
    { label: 'CSR',              value: fmtShort(csrTotal),        color: PALETTE[5] },
    { label: 'Dues Collected',   value: fmtShort(duesCollected),   color: PALETTE[6] },
    { label: 'Dues Pending',     value: fmtShort(duesPending),     color: PALETTE[7] },
    { label: 'Total Inflows',    value: fmtShort(inflows),         color: PALETTE[8] },
    { label: 'Expenses',         value: fmtShort(expenses),        color: PALETTE[9] },
    { label: 'Active Members',   value: fmtInt(activeMembers),     color: PALETTE[10] },
    { label: 'Payments Captured', value: fmtInt(captured),         color: PALETTE[11] },
  ];

  // -- Cross-cutting charts -------------------------------------------
  const buckets = monthBucketsBetween(p.start, p.end);
  const monthLabel = buckets.map((b) => b.key);

  const monthActs = buckets.map(() => 0);
  const monthBenefs = buckets.map(() => 0);
  const monthHours = buckets.map(() => 0);
  const monthDons = buckets.map(() => 0);
  for (const a of acts) {
    const i = buckets.findIndex((b) => sameMonth(b.date, new Date(a.date)));
    if (i >= 0) {
      monthActs[i]++;
      monthBenefs[i] += a.beneficiaries ?? 0;
      monthHours[i] += Number(a.service_hours ?? 0);
    }
  }
  for (const d of dons) {
    const i = buckets.findIndex((b) => sameMonth(b.date, new Date(d.created_at)));
    if (i >= 0) monthDons[i] += Number(d.amount);
  }

  doc.charts.push({
    kind: 'line', title: 'Cross-Entity Trend — Monthly',
    labels: monthLabel,
    series: [
      { name: 'Activities',     color: PALETTE[0], data: monthActs },
      { name: 'Beneficiaries (÷10)', color: PALETTE[1], data: monthBenefs.map((v) => Math.round(v / 10)) },
      { name: 'Hours (÷5)',     color: PALETTE[2], data: monthHours.map((v) => Math.round(v / 5)) },
      { name: 'Donations (₹K)', color: PALETTE[4], data: monthDons.map((v) => Math.round(v / 1000)) },
    ],
  });

  doc.charts.push({
    kind: 'donut', title: 'Inflow Mix — Where the money came from',
    labels: ['Donations', 'CSR', 'Dues Paid', 'Project Receipts'],
    series: [{ name: 'INR', data: [donationTotal, csrTotal, duesCollected, projectFunds] }],
  });

  const catMap = new Map<string, number>();
  for (const a of acts) catMap.set((a.category ?? 'other').toString(), (catMap.get((a.category ?? 'other').toString()) ?? 0) + (a.beneficiaries ?? 0));
  const cats = [...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  doc.charts.push({
    kind: 'horizontal_bar', title: 'Beneficiaries by Service Category',
    labels: cats.map(([k]) => titleCase(k)),
    series: [{ name: 'People', data: cats.map(([, v]) => v) }],
  });

  // CSR partner → activities → beneficiaries chain
  const csrChain = new Map<string, { name: string; sponsored: number; activities: number; beneficiaries: number }>();
  for (const c of csrs) csrChain.set(c.id, { name: c.name, sponsored: 0, activities: 0, beneficiaries: 0 });
  for (const a of acts) {
    if (!a.csr_partner_id) continue;
    const row = csrChain.get(a.csr_partner_id);
    if (!row) continue;
    row.sponsored += Number(a.sponsorship_amount ?? 0);
    row.activities++;
    row.beneficiaries += a.beneficiaries ?? 0;
  }
  const csrRanked = [...csrChain.values()].filter((r) => r.activities > 0).sort((a, b) => b.sponsored - a.sponsored).slice(0, 8);
  if (csrRanked.length) {
    doc.charts.push({
      kind: 'stacked_bar', title: 'CSR Partner Chain — Sponsorship × Projects × People',
      labels: csrRanked.map((r) => r.name),
      series: [
        { name: 'Sponsored (₹K)', color: PALETTE[5], data: csrRanked.map((r) => Math.round(r.sponsored / 1000)) },
        { name: 'Projects',        color: PALETTE[0], data: csrRanked.map((r) => r.activities) },
        { name: 'Beneficiaries (÷10)', color: PALETTE[1], data: csrRanked.map((r) => Math.round(r.beneficiaries / 10)) },
      ],
    });
  }

  // Volunteer leaderboard cross-linked with member status
  const volByMember = new Map<string, { name: string; status: string; hours: number; activities: Set<string> }>();
  const memberMap = new Map(members.map((m) => [m.id, m]));
  for (const v of vols) {
    const m = memberMap.get(v.member_id);
    const cur = volByMember.get(v.member_id) ?? {
      name: v.members?.name ?? m?.name ?? 'Member',
      status: m?.status ?? 'unknown',
      hours: 0,
      activities: new Set<string>(),
    };
    cur.hours += Number(v.hours);
    if (v.activity_id) cur.activities.add(v.activity_id);
    volByMember.set(v.member_id, cur);
  }
  const topVols = [...volByMember.values()].sort((a, b) => b.hours - a.hours).slice(0, 12);

  // -- Tables ----------------------------------------------------------
  doc.tables.push({
    title: 'Top Service Projects (with CSR + SDG links)',
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'title', label: 'Project' },
      { key: 'category', label: 'Category' },
      { key: 'sdg', label: 'SDGs' },
      { key: 'csr', label: 'CSR Partner' },
      { key: 'beneficiaries', label: 'People', align: 'right' },
      { key: 'funds', label: 'Funds', align: 'right' },
    ],
    rows: topN(acts, 12, (a) => (a.beneficiaries ?? 0) * 2 + Number(a.amount_raised ?? 0) / 1000).map((a) => {
      const csr = csrs.find((c) => c.id === a.csr_partner_id);
      return {
        date: new Date(a.date).toLocaleDateString('en-IN'),
        title: a.title,
        category: titleCase(a.category ?? '—'),
        sdg: ((a.sdg_codes as string[] | null) ?? []).join(', ') || '—',
        csr: csr?.name ?? '—',
        beneficiaries: fmtInt(a.beneficiaries ?? 0),
        funds: fmtINR(Number(a.amount_raised ?? 0)),
      };
    }),
  });

  if (topVols.length) {
    doc.tables.push({
      title: 'Volunteer Leaderboard × Membership Status',
      columns: [
        { key: 'rank', label: '#', align: 'right' },
        { key: 'name', label: 'Volunteer' },
        { key: 'status', label: 'Status' },
        { key: 'projects', label: 'Projects', align: 'right' },
        { key: 'hours', label: 'Hours', align: 'right' },
      ],
      rows: topVols.map((v, i) => ({
        rank: i + 1, name: v.name, status: v.status,
        projects: v.activities.size, hours: fmtInt(v.hours),
      })),
    });
  }

  // Money flow table
  doc.tables.push({
    title: 'Period Cash Flow — Inflows × Outflows × Net',
    columns: [
      { key: 'k', label: 'Line' },
      { key: 'count', label: 'Count', align: 'right' },
      { key: 'amount', label: 'Amount (₹)', align: 'right' },
    ],
    rows: [
      { k: 'Online Donations',  count: dons.filter((d) => d.payment_id).length, amount: fmtINR(sumBy(dons.filter((d) => d.payment_id), (d) => Number(d.amount))) },
      { k: 'Offline Donations', count: dons.filter((d) => !d.payment_id).length, amount: fmtINR(sumBy(dons.filter((d) => !d.payment_id), (d) => Number(d.amount))) },
      { k: 'CSR Sponsorship',   count: csrChain.size,         amount: fmtINR(csrTotal) },
      { k: 'Dues Paid',         count: dues.filter((d) => d.status === 'paid').length, amount: fmtINR(duesCollected) },
      { k: 'Project Receipts',  count: acts.filter((a) => Number(a.amount_raised ?? 0) > 0).length, amount: fmtINR(projectFunds) },
      { k: 'Project Expenses',  count: acts.filter((a) => Number(a.expenses ?? 0) > 0).length, amount: fmtINR(expenses) },
      { k: 'Budget Planned',    count: acts.filter((a) => Number(a.budget ?? 0) > 0).length, amount: fmtINR(budget) },
    ],
    totals: { k: 'NET (Inflows − Expenses)', count: '', amount: fmtINR(inflows - expenses) },
  });

  // Beneficiary engagement
  if (benesSvc.length) {
    doc.tables.push({
      title: 'Beneficiary Engagement — services delivered in period',
      columns: [
        { key: 'count',     label: 'Beneficiaries reached', align: 'right' },
        { key: 'services',  label: 'Services logged',       align: 'right' },
        { key: 'value',     label: 'Value delivered (₹)',   align: 'right' },
        { key: 'followups', label: 'Follow-ups required',   align: 'right' },
        { key: 'database',  label: 'Total CRM records',     align: 'right' },
      ],
      rows: [{
        count: fmtInt(benesReached),
        services: fmtInt(benesSvc.length),
        value: fmtINR(valueDelivered),
        followups: fmtInt(benesSvc.filter((s) => s.follow_up_required).length),
        database: fmtInt(benes.length),
      }],
    });
  }

  // Events & RSVPs
  if (events.length) {
    const ids = events.map((e) => e.id);
    const { data: rsvps } = await db().from('event_rsvps').select('event_id,status').in('event_id', ids);
    const rsvpAgg = new Map<string, { yes: number; total: number }>();
    for (const r of rsvps ?? []) {
      const cur = rsvpAgg.get(r.event_id) ?? { yes: 0, total: 0 };
      cur.total++;
      if (r.status === 'yes') cur.yes++;
      rsvpAgg.set(r.event_id, cur);
    }
    doc.tables.push({
      title: 'Events × RSVPs × Activities Generated',
      columns: [
        { key: 'date', label: 'When' },
        { key: 'title', label: 'Event' },
        { key: 'rsvps', label: 'RSVPs', align: 'right' },
        { key: 'yes', label: 'Confirmed', align: 'right' },
        { key: 'linked', label: 'Linked Activities', align: 'right' },
      ],
      rows: events.slice(0, 10).map((e) => ({
        date: new Date(e.date).toLocaleDateString('en-IN'),
        title: e.title,
        rsvps: rsvpAgg.get(e.id)?.total ?? 0,
        yes: rsvpAgg.get(e.id)?.yes ?? 0,
        linked: acts.filter((a) => a.event_id === e.id).length,
      })),
    });
  }

  // Awards
  if (awards.length) {
    doc.tables.push({
      title: 'Recognition for the Lions Year',
      columns: [
        { key: 'tier', label: 'Tier' },
        { key: 'name', label: 'Award' },
        { key: 'member', label: 'Recipient' },
        { key: 'club', label: 'Club' },
        { key: 'status', label: 'Status' },
      ],
      rows: awards.map((a) => ({
        tier: a.tier,
        name: a.award_name,
        member: (a.members as { name?: string })?.name ?? '—',
        club: (a.clubs as { name?: string })?.name ?? '—',
        status: a.status,
      })),
    });
  }

  // -- Narrative ------------------------------------------------------
  doc.narrative.push({
    heading: 'How everything connects',
    body:
      `During ${p.label}, the Club ran ${acts.length} activities. These activities served ${fmtInt(beneficiaries)} ` +
      `beneficiaries, were supported by ${fmtInt(volByMember.size)} volunteer Lions logging ${fmtInt(hours)} hours, ` +
      `funded by ${csrChain.size} CSR partners (${fmtINR(csrTotal)}), ${dons.length} donors (${fmtINR(donationTotal)}) and ` +
      `member dues (${fmtINR(duesCollected)} collected, ${fmtINR(duesPending)} pending). Activities aligned with the Lions ` +
      `International service framework and the United Nations SDGs, and were tracked in the beneficiary CRM with ` +
      `${fmtInt(benesSvc.length)} service records covering ${fmtInt(benesReached)} unique beneficiaries.`,
  });

  doc.narrative.push({
    heading: 'Membership in motion',
    body:
      `${activeMembers} active members participated across ${clubs.length} clubs. ${topVols[0]?.name ?? '—'} led the ` +
      `volunteer leaderboard with ${fmtInt(topVols[0]?.hours ?? 0)} hours across ${topVols[0]?.activities.size ?? 0} ` +
      `service projects. ${awards.length} award qualifications were tracked for Lions Year ${p.lionsYear}, of which ` +
      `${awards.filter((a) => a.status === 'awarded').length} have been formally awarded.`,
  });

  doc.narrative.push({
    heading: 'Money in / money out',
    body:
      `Inflows: ${fmtINR(inflows)} = ${fmtINR(donationTotal)} donations + ${fmtINR(csrTotal)} CSR + ` +
      `${fmtINR(duesCollected)} dues + ${fmtINR(projectFunds)} project receipts. Outflows: ${fmtINR(expenses)} in ` +
      `project expenses against a planned budget of ${fmtINR(budget)}. Net for the period: ` +
      `${fmtINR(inflows - expenses)}. Online payments captured: ${captured} of ${payments.length}.`,
  });

  doc.totals = {
    activities: acts.length, beneficiaries, hours, donations: donationTotal,
    csr: csrTotal, dues_collected: duesCollected, dues_pending: duesPending,
    expenses, inflows, net: inflows - expenses,
    active_members: activeMembers, beneficiary_records: benes.length,
    events: events.length, awards: awards.length, csr_partners: csrChain.size,
  };

  return doc;
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
function titleCase(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
