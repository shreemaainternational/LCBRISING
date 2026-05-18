/**
 * Annual / Lions Year report — extends the base period report with
 * President's message, Secretary's report, Treasurer's report,
 * mega-project gallery, top-donor recognition, sponsor recognition
 * and a future roadmap section.
 */
import type { ReportDoc, ReportFilters, ReportPeriod, NarrativeSection } from '../types';
import {
  fetchActivities, fetchDonations, fetchMembersSnapshot, fetchVolunteerLogs,
  fetchAwards, fetchCSRPartners, fetchEvents, sumBy, topN,
} from '../aggregations';
import { buildPeriodReport } from './period-reports';
import { fmtINR, fmtInt, fmtShort } from './common';

interface AnnualOfficers {
  president?: { name: string; signoff?: string };
  secretary?: { name: string; signoff?: string };
  treasurer?: { name: string; signoff?: string };
}

async function getOfficers(): Promise<AnnualOfficers> {
  const members = await fetchMembersSnapshot();
  const find = (role: string) => members.find((m) => m.role === role && m.status === 'active');
  return {
    president: find('president') ? { name: find('president')!.name, signoff: 'President' } : undefined,
    secretary: find('secretary') ? { name: find('secretary')!.name, signoff: 'Secretary' } : undefined,
    treasurer: find('treasurer') ? { name: find('treasurer')!.name, signoff: 'Treasurer' } : undefined,
  };
}

export async function buildAnnualReport(p: ReportPeriod, f: ReportFilters): Promise<ReportDoc> {
  // Start with the base period rollup so we inherit KPIs + charts + tables.
  const doc = await buildPeriodReport(
    { type: 'yearly', title: `Annual Report — ${p.label}` },
    p, f,
  );
  doc.subtitle = 'A year of service. A year of impact.';

  const [officers, acts, dons, vols, events, awards, csrPartners] = await Promise.all([
    getOfficers(),
    fetchActivities(p, f),
    fetchDonations(p, f),
    fetchVolunteerLogs(p, f),
    fetchEvents(p),
    fetchAwards(p.lionsYear),
    fetchCSRPartners(),
  ]);

  const beneficiaries = sumBy(acts, (a) => a.beneficiaries ?? 0);
  const hours = sumBy(vols, (v) => Number(v.hours)) || sumBy(acts, (a) => Number(a.service_hours ?? 0));
  const projectFunds = sumBy(acts, (a) => Number(a.amount_raised ?? 0));
  const csrTotal = sumBy(acts, (a) => Number(a.sponsorship_amount ?? 0));
  const donationTotal = sumBy(dons, (d) => Number(d.amount));
  const totalExpenses = sumBy(acts, (a) => Number(a.expenses ?? 0));
  const totalBudget = sumBy(acts, (a) => Number(a.budget ?? 0));

  // Build officer letters
  const letters: NarrativeSection[] = [];

  letters.push({
    heading: `${officers.president?.signoff ?? 'President'}'s Message`,
    body:
      `Dear fellow Lions, Leos and friends of the Club,\n\n` +
      `Lions Year ${p.lionsYear} has been a remarkable chapter in the story of Lions Club of ` +
      `Baroda Rising Star. Together we delivered ${acts.length} service projects, touched ` +
      `${fmtInt(beneficiaries)} lives and contributed ${fmtInt(hours)} hours of voluntary service ` +
      `to our community. From eye camps and blood donation drives to environmental restoration and ` +
      `educational support, every project this year reflected the spirit of "We Serve."\n\n` +
      `I am deeply grateful to every member, every Leo, every CSR partner and every donor who made ` +
      `this possible. As we look ahead, our resolve only grows stronger — to widen our circle of ` +
      `impact, to deepen our service to the most vulnerable, and to carry the Lions banner with ` +
      `pride into the next year.\n\n` +
      `With warm regards,\n${officers.president?.name ?? 'Club President'}\nPresident, Lions Club of Baroda Rising Star`,
  });

  letters.push({
    heading: `${officers.secretary?.signoff ?? 'Secretary'}'s Report`,
    body:
      `It gives me great satisfaction to present the Secretary's annual report for Lions Year ${p.lionsYear}.\n\n` +
      `Over the year, the Club organized ${acts.length} service activities and ${events.length} ` +
      `formal events, with attendance and member engagement holding strong. We onboarded new ` +
      `Lions, conducted regular board and general meetings, and maintained timely reporting to the ` +
      `District and Multiple District. Our Club continues to be in good standing with Lions ` +
      `International and meets all charter and reporting obligations.\n\n` +
      `${awards.length} member and club achievements were tracked and recognised across the year, ` +
      `including MJF / PMJF, Club Excellence and Presidential awards. Detailed activity, ` +
      `attendance and award registers are maintained in the Club CRM and are available for ` +
      `inspection.\n\n` +
      `Respectfully submitted,\n${officers.secretary?.name ?? 'Club Secretary'}\nSecretary, Lions Club of Baroda Rising Star`,
  });

  letters.push({
    heading: `${officers.treasurer?.signoff ?? 'Treasurer'}'s Report`,
    body:
      `For Lions Year ${p.lionsYear}, the Club mobilised a total of ${fmtINR(donationTotal + csrTotal + projectFunds)} ` +
      `across all sources: ${fmtINR(donationTotal)} in donations from ${dons.length} contributors, ` +
      `${fmtINR(csrTotal)} from CSR partnerships, and ${fmtINR(projectFunds)} from direct project ` +
      `receipts.\n\n` +
      `Approved budgets across all projects amounted to ${fmtINR(totalBudget)}, against which actual ` +
      `expenditure was ${fmtINR(totalExpenses)} — reflecting disciplined financial stewardship and ` +
      `cost-conscious project execution. The net surplus for the year stands at ` +
      `${fmtINR(donationTotal + csrTotal + projectFunds - totalExpenses)}, available to seed projects ` +
      `for the coming Lions Year.\n\n` +
      `The books of the Club are maintained transparently in the CRM and are subject to the ` +
      `District-level audit framework. I thank every donor, every CSR partner and every member ` +
      `for the trust they have placed in the Club.\n\n` +
      `Respectfully,\n${officers.treasurer?.name ?? 'Club Treasurer'}\nTreasurer, Lions Club of Baroda Rising Star`,
  });

  // Push officer letters AHEAD of the auto-generated narrative.
  doc.narrative = [...letters, ...doc.narrative];

  // Mega projects — top 10 by beneficiaries
  const megaProjects = topN(acts, 10, (a) => (a.beneficiaries ?? 0) * 2 + Number(a.amount_raised ?? 0) / 1000);
  if (megaProjects.length) {
    doc.tables.push({
      title: 'Mega Projects of the Year',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'title', label: 'Project' },
        { key: 'category', label: 'Category' },
        { key: 'location', label: 'Location' },
        { key: 'beneficiaries', label: 'People Served', align: 'right' },
        { key: 'funds', label: 'Funds (INR)', align: 'right' },
      ],
      rows: megaProjects.map((a) => ({
        date: new Date(a.date).toLocaleDateString('en-IN'),
        title: a.title,
        category: (a.category ?? '—').replace(/_/g, ' '),
        location: a.location ?? '—',
        beneficiaries: fmtInt(a.beneficiaries ?? 0),
        funds: fmtINR(Number(a.amount_raised ?? 0)),
      })),
      totals: {
        date: '', title: 'TOTAL', category: '', location: '',
        beneficiaries: fmtInt(sumBy(megaProjects, (a) => a.beneficiaries ?? 0)),
        funds: fmtINR(sumBy(megaProjects, (a) => Number(a.amount_raised ?? 0))),
      },
    });
  }

  // Top donors honour roll
  const donorMap = new Map<string, { name: string; total: number; count: number }>();
  for (const d of dons) {
    const key = (d.donor_email ?? d.donor_name ?? 'anon').toLowerCase();
    const cur = donorMap.get(key) ?? { name: d.is_anonymous ? 'Anonymous' : d.donor_name, total: 0, count: 0 };
    cur.total += Number(d.amount); cur.count++;
    donorMap.set(key, cur);
  }
  const topDonors = [...donorMap.values()].sort((a, b) => b.total - a.total).slice(0, 20);
  if (topDonors.length) {
    doc.tables.push({
      title: 'Top Donors — Roll of Honour',
      columns: [
        { key: 'rank', label: '#', align: 'right' },
        { key: 'name', label: 'Donor' },
        { key: 'count', label: 'Gifts', align: 'right' },
        { key: 'amount', label: 'Lifetime This Year', align: 'right' },
      ],
      rows: topDonors.map((d, i) => ({
        rank: i + 1, name: d.name, count: d.count, amount: fmtINR(d.total),
      })),
    });
  }

  // CSR partner recognition
  const activeCsr = csrPartners.filter((p) => p.is_active);
  if (activeCsr.length) {
    doc.tables.push({
      title: 'CSR Partners & Sponsors',
      columns: [
        { key: 'name', label: 'Partner' },
        { key: 'started', label: 'Partnership Since' },
        { key: 'amount', label: 'Total Contributed', align: 'right' },
      ],
      rows: activeCsr
        .sort((a, b) => Number(b.total_contributed) - Number(a.total_contributed))
        .map((p) => ({
          name: p.name,
          started: p.partnership_started_on ? new Date(p.partnership_started_on).toLocaleDateString('en-IN') : '—',
          amount: fmtINR(Number(p.total_contributed ?? 0)),
        })),
    });
  }

  // Awards register
  if (awards.length) {
    doc.tables.push({
      title: 'Member Recognition & Awards',
      columns: [
        { key: 'tier', label: 'Tier' },
        { key: 'award', label: 'Award' },
        { key: 'member', label: 'Recipient' },
        { key: 'awarded', label: 'Date' },
      ],
      rows: awards
        .filter((a) => a.status === 'awarded')
        .map((a) => ({
          tier: humanizeTier(a.tier),
          award: a.award_name,
          member: (a.members as { name?: string })?.name ?? '—',
          awarded: a.awarded_on ? new Date(a.awarded_on).toLocaleDateString('en-IN') : '—',
        })),
    });
  }

  // Appendix sections
  doc.appendix = [
    ...(doc.appendix ?? []),
    {
      heading: 'Future Roadmap',
      body:
        `Building on the achievements of ${p.label}, the Club's roadmap for the coming Lions Year ` +
        `centers on five priorities: (1) deeper engagement with Lions International's Global Causes ` +
        `— Vision, Diabetes, Childhood Cancer, Hunger, Environment and Humanitarian; (2) launching ` +
        `mega projects in eye care and pediatric healthcare in partnership with district hospitals; ` +
        `(3) doubling the active Leo membership through structured leadership programs; (4) growing ` +
        `the CSR partner pool to expand reach in education and women's empowerment; and (5) ` +
        `strengthening reporting transparency through the Club's digital CRM and annual audit.`,
    },
    {
      heading: 'Acknowledgements',
      body:
        `The Club gratefully acknowledges the support of Lions International, District 3232 F1, ` +
        `Multiple District 323, the District Governor and Cabinet Officers, all CSR partners, ` +
        `medical institutions, schools, district administration and citizens of Vadodara whose ` +
        `partnership made this year of service possible. To every Lion who said "yes" when service ` +
        `called, thank you.`,
    },
    {
      heading: 'About This Report',
      body:
        `This Annual Report has been generated by the Lions Club of Baroda Rising Star Reporting ` +
        `Engine, which consolidates data from the Club's CRM, donation ledger, beneficiary register, ` +
        `volunteer-hours log and CSR partner database. All figures are computed from primary records ` +
        `and are reconciled with the Club's books at year-end.`,
    },
  ];

  return doc;
}

function humanizeTier(t: string): string {
  return ({
    mjf: 'Melvin Jones Fellow',
    pmjf: 'Progressive MJF',
    club_excellence: 'Club Excellence',
    presidential: 'Presidential',
    governor_appreciation: "Governor's Appreciation",
    leadership: 'Leadership',
    service: 'Service',
    membership_growth: 'Membership Growth',
    centennial: 'Centennial',
  } as Record<string, string>)[t] ?? t;
}
