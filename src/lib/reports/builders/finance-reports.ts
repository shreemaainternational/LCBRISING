/** Financial / Donor / CSR reports. */
import type { ReportDoc, ReportFilters, ReportPeriod } from '../types';
import {
  fetchActivities, fetchDonations, fetchDues, fetchPayments,
  fetchCSRPartners, sumBy, groupBy, topN, db,
} from '../aggregations';
import { monthBucketsBetween } from '../period';
import { PALETTE } from '../brand';
import { emptyDoc, fmtINR, fmtInt, fmtShort } from './common';

export async function buildFinancialReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('financial', 'Financial Report', p, f);
  const [acts, dons, dues, pays] = await Promise.all([
    fetchActivities(p, f), fetchDonations(p, f), fetchDues(p), fetchPayments(p),
  ]);

  const donationTotal = sumBy(dons, (d) => Number(d.amount));
  const duesCollected = sumBy(dues.filter((d) => d.status === 'paid'), (d) => Number(d.amount));
  const duesPending = sumBy(dues.filter((d) => d.status === 'pending'), (d) => Number(d.amount));
  const csrTotal = sumBy(acts, (a) => Number(a.sponsorship_amount ?? 0));
  const budgetTotal = sumBy(acts, (a) => Number(a.budget ?? 0));
  const expensesTotal = sumBy(acts, (a) => Number(a.expenses ?? 0));
  const projectFunds = sumBy(acts, (a) => Number(a.amount_raised ?? 0));
  const inflows = donationTotal + duesCollected + csrTotal + projectFunds;
  const captured = pays.filter((p) => p.status === 'captured').length;

  doc.kpis = [
    { label: 'Total Inflows',    value: fmtShort(inflows),         color: PALETTE[0] },
    { label: 'Donations',        value: fmtShort(donationTotal),   color: PALETTE[1] },
    { label: 'CSR Funds',        value: fmtShort(csrTotal),        color: PALETTE[2] },
    { label: 'Dues Collected',   value: fmtShort(duesCollected),   color: PALETTE[3] },
    { label: 'Dues Pending',     value: fmtShort(duesPending),     color: PALETTE[4] },
    { label: 'Project Receipts', value: fmtShort(projectFunds),    color: PALETTE[5] },
    { label: 'Budget Planned',   value: fmtShort(budgetTotal),     color: PALETTE[6] },
    { label: 'Expenses',         value: fmtShort(expensesTotal),   color: PALETTE[7] },
    { label: 'Net',              value: fmtShort(inflows - expensesTotal), color: PALETTE[8] },
    { label: 'Payments Captured', value: fmtInt(captured),         color: PALETTE[9] },
    { label: 'Donations Count',  value: fmtInt(dons.length),       color: PALETTE[10] },
    { label: 'Activities',       value: fmtInt(acts.length),       color: PALETTE[11] },
  ];

  doc.charts.push({
    kind: 'donut',
    title: 'Inflow Sources',
    labels: ['Donations', 'CSR', 'Dues', 'Project Receipts'],
    series: [{ name: 'INR', data: [donationTotal, csrTotal, duesCollected, projectFunds] }],
  });

  doc.charts.push({
    kind: 'stacked_bar',
    title: 'Budget vs Expense by Category',
    labels: [...new Set(acts.map((a) => (a.category ?? 'other').toString()))].slice(0, 8),
    series: [
      {
        name: 'Budget',
        color: PALETTE[0],
        data: [...new Set(acts.map((a) => (a.category ?? 'other').toString()))].slice(0, 8)
          .map((k) => sumBy(acts.filter((a) => (a.category ?? 'other') === k), (a) => Number(a.budget ?? 0))),
      },
      {
        name: 'Expense',
        color: PALETTE[3],
        data: [...new Set(acts.map((a) => (a.category ?? 'other').toString()))].slice(0, 8)
          .map((k) => sumBy(acts.filter((a) => (a.category ?? 'other') === k), (a) => Number(a.expenses ?? 0))),
      },
    ],
  });

  const buckets = monthBucketsBetween(p.start, p.end);
  const monthlyIn = buckets.map(() => 0);
  for (const d of dons) {
    const i = bucketIdx(buckets, new Date(d.created_at));
    if (i >= 0) monthlyIn[i] += Number(d.amount);
  }
  doc.charts.push({
    kind: 'line',
    title: 'Monthly Donation Trend',
    labels: buckets.map((b) => b.key),
    series: [{ name: 'Donations', data: monthlyIn, color: PALETTE[1] }],
  });

  doc.tables.push({
    title: 'Monthly Cash Flow Summary',
    columns: [
      { key: 'm', label: 'Month' },
      { key: 'don', label: 'Donations', align: 'right' },
      { key: 'csr', label: 'CSR', align: 'right' },
      { key: 'dues', label: 'Dues', align: 'right' },
      { key: 'exp', label: 'Expenses', align: 'right' },
      { key: 'net', label: 'Net', align: 'right' },
    ],
    rows: buckets.map((b, i) => {
      const monthActs = acts.filter((a) => sameMonth(new Date(a.date), b.date));
      const monthDons = dons.filter((x) => sameMonth(new Date(x.created_at), b.date));
      const monthDues = dues.filter((x) => sameMonth(new Date(x.paid_at ?? x.created_at), b.date) && x.status === 'paid');
      const don = sumBy(monthDons, (x) => Number(x.amount));
      const csr = sumBy(monthActs, (a) => Number(a.sponsorship_amount ?? 0));
      const dCol = sumBy(monthDues, (x) => Number(x.amount));
      const exp = sumBy(monthActs, (a) => Number(a.expenses ?? 0));
      return { m: b.key, don: fmtINR(don), csr: fmtINR(csr), dues: fmtINR(dCol), exp: fmtINR(exp), net: fmtINR(don + csr + dCol - exp) };
    }),
    totals: {
      m: 'TOTAL',
      don: fmtINR(donationTotal),
      csr: fmtINR(csrTotal),
      dues: fmtINR(duesCollected),
      exp: fmtINR(expensesTotal),
      net: fmtINR(inflows - expensesTotal),
    },
  });

  doc.narrative.push({
    heading: 'Financial Health',
    body:
      `Total inflows for ${p.label}: ${fmtINR(inflows)}. Donations contributed ${fmtINR(donationTotal)} across ${dons.length} ` +
      `transactions; CSR partnerships brought ${fmtINR(csrTotal)}; member dues collected ${fmtINR(duesCollected)} ` +
      `with ${fmtINR(duesPending)} still pending. Net surplus / (deficit): ${fmtINR(inflows - expensesTotal)}.`,
  });
  doc.totals = { inflows, donationTotal, csrTotal, duesCollected, duesPending, expensesTotal };
  return doc;
}

export async function buildDonorReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('donor', 'Donor Report', p, f);
  const dons = await fetchDonations(p, f);

  const byDonor = new Map<string, { name: string; total: number; count: number; last: string }>();
  for (const d of dons) {
    const key = (d.donor_email ?? d.donor_name ?? 'anon').toLowerCase();
    const cur = byDonor.get(key) ?? { name: d.is_anonymous ? 'Anonymous' : d.donor_name, total: 0, count: 0, last: d.created_at };
    cur.total += Number(d.amount);
    cur.count += 1;
    if (new Date(d.created_at) > new Date(cur.last)) cur.last = d.created_at;
    byDonor.set(key, cur);
  }
  const donors = [...byDonor.values()].sort((a, b) => b.total - a.total);

  const total = donors.reduce((a, b) => a + b.total, 0);
  const avg = donors.length ? total / donors.length : 0;
  const repeat = donors.filter((d) => d.count > 1).length;

  doc.kpis = [
    { label: 'Unique Donors',     value: fmtInt(donors.length),  color: PALETTE[0] },
    { label: 'Total Raised',      value: fmtShort(total),        color: PALETTE[1] },
    { label: 'Average Gift',      value: fmtShort(avg),          color: PALETTE[2] },
    { label: 'Repeat Donors',     value: fmtInt(repeat),         color: PALETTE[3] },
    { label: 'Transactions',      value: fmtInt(dons.length),    color: PALETTE[4] },
    { label: 'Largest Gift',      value: fmtShort(donors[0]?.total ?? 0), color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'horizontal_bar',
    title: 'Top Donors (by Total)',
    labels: donors.slice(0, 10).map((d) => d.name),
    series: [{ name: 'INR', data: donors.slice(0, 10).map((d) => d.total) }],
  });
  const campaignBuckets = new Map<string, number>();
  for (const d of dons) campaignBuckets.set(d.campaign ?? 'General', (campaignBuckets.get(d.campaign ?? 'General') ?? 0) + Number(d.amount));
  doc.charts.push({
    kind: 'pie',
    title: 'Donations by Campaign',
    labels: [...campaignBuckets.keys()],
    series: [{ name: 'INR', data: [...campaignBuckets.values()] }],
  });

  doc.tables.push({
    title: 'Donor Ledger',
    columns: [
      { key: 'name', label: 'Donor' },
      { key: 'count', label: 'Gifts', align: 'right' },
      { key: 'total', label: 'Total', align: 'right' },
      { key: 'last', label: 'Last Gift' },
    ],
    rows: donors.slice(0, 25).map((d) => ({
      name: d.name, count: d.count, total: fmtINR(d.total),
      last: new Date(d.last).toLocaleDateString('en-IN'),
    })),
    totals: { name: 'TOTAL', count: donors.length, total: fmtINR(total), last: '' },
  });

  doc.narrative.push({
    heading: 'Donor Engagement',
    body:
      `The club received support from ${donors.length} unique donors during ${p.label}, raising ${fmtINR(total)} in total. ` +
      `Average gift size was ${fmtINR(avg)} and ${repeat} donors gave more than once — a strong indicator of donor ` +
      `confidence and recurring relationships. The single largest gift was ${fmtINR(donors[0]?.total ?? 0)} from ${donors[0]?.name ?? '—'}.`,
  });
  doc.totals = { total, donors: donors.length, avg, repeat };
  return doc;
}

export async function buildCSRReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  const doc = emptyDoc('csr', 'CSR Partnership Report', p, f);
  const [acts, partners] = await Promise.all([fetchActivities(p, f), fetchCSRPartners()]);

  const byPartner = new Map<string, { name: string; amount: number; projects: number; beneficiaries: number }>();
  for (const a of acts) {
    if (!a.csr_partner_id) continue;
    const partner = partners.find((p) => p.id === a.csr_partner_id);
    if (!partner) continue;
    const cur = byPartner.get(partner.id) ?? { name: partner.name, amount: 0, projects: 0, beneficiaries: 0 };
    cur.amount += Number(a.sponsorship_amount ?? 0);
    cur.projects += 1;
    cur.beneficiaries += a.beneficiaries ?? 0;
    byPartner.set(partner.id, cur);
  }
  const ranked = [...byPartner.values()].sort((a, b) => b.amount - a.amount);
  const total = ranked.reduce((a, b) => a + b.amount, 0);
  const totalBenef = ranked.reduce((a, b) => a + b.beneficiaries, 0);

  doc.kpis = [
    { label: 'CSR Partners Engaged',    value: fmtInt(ranked.length),    color: PALETTE[0] },
    { label: 'Total Sponsorship',       value: fmtShort(total),          color: PALETTE[1] },
    { label: 'CSR-Funded Projects',     value: fmtInt(ranked.reduce((a, b) => a + b.projects, 0)), color: PALETTE[2] },
    { label: 'Beneficiaries via CSR',   value: fmtInt(totalBenef),       color: PALETTE[3] },
    { label: 'Avg per Partner',         value: fmtShort(ranked.length ? total / ranked.length : 0), color: PALETTE[4] },
    { label: 'Active Partners (DB)',    value: fmtInt(partners.filter((p) => p.is_active).length), color: PALETTE[5] },
  ];

  doc.charts.push({
    kind: 'horizontal_bar',
    title: 'CSR Contribution by Partner',
    labels: ranked.slice(0, 10).map((r) => r.name),
    series: [{ name: 'INR', data: ranked.slice(0, 10).map((r) => r.amount) }],
  });
  doc.charts.push({
    kind: 'bar',
    title: 'Projects vs Beneficiaries by Partner',
    labels: ranked.slice(0, 8).map((r) => r.name),
    series: [
      { name: 'Projects', data: ranked.slice(0, 8).map((r) => r.projects), color: PALETTE[0] },
      { name: 'Beneficiaries (x10)', data: ranked.slice(0, 8).map((r) => Math.round(r.beneficiaries / 10)), color: PALETTE[2] },
    ],
  });

  doc.tables.push({
    title: 'CSR Partner Ledger',
    columns: [
      { key: 'name', label: 'Partner' },
      { key: 'projects', label: 'Projects', align: 'right' },
      { key: 'amount', label: 'Sponsored', align: 'right' },
      { key: 'beneficiaries', label: 'Beneficiaries', align: 'right' },
    ],
    rows: ranked.map((r) => ({
      name: r.name, projects: r.projects,
      amount: fmtINR(r.amount), beneficiaries: fmtInt(r.beneficiaries),
    })),
    totals: { name: 'TOTAL', projects: ranked.reduce((a, b) => a + b.projects, 0), amount: fmtINR(total), beneficiaries: fmtInt(totalBenef) },
  });

  doc.narrative.push({
    heading: 'CSR Partnership Impact',
    body:
      `During ${p.label}, the club partnered with ${ranked.length} CSR donors mobilising ${fmtINR(total)} towards ` +
      `${ranked.reduce((a, b) => a + b.projects, 0)} community projects that reached ${fmtInt(totalBenef)} beneficiaries. ` +
      `${ranked[0]?.name ?? 'No partner'} led contributions with ${fmtINR(ranked[0]?.amount ?? 0)}.`,
  });
  doc.totals = { partners: ranked.length, total, beneficiaries: totalBenef };
  return doc;
}

function bucketIdx(buckets: { date: Date }[], d: Date): number {
  return buckets.findIndex((b) => b.date.getMonth() === d.getMonth() && b.date.getFullYear() === d.getFullYear());
}
function sameMonth(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
