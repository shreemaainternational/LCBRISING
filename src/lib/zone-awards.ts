/**
 * Award eligibility scoring for clubs and members in a zone.
 *
 * Tracks the canonical Lions International awards a Zone Chair cares about:
 *   - Club Excellence Award (CEA)
 *   - 100% President's Award
 *   - District Governor Honor (placeholder thresholds)
 *
 * Rules below approximate the published criteria — actual MyLCI rules
 * may differ year-to-year. Adjust thresholds in CRITERIA as needed.
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface AwardCriterion {
  key: string;
  label: string;
  threshold: number;
  unit: string;
  hint?: string;
}

export interface AwardScore {
  key: string;
  label: string;
  eligible: boolean;
  percent: number;          // 0-100 of how close to all criteria
  criteria: { criterion: AwardCriterion; current: number; met: boolean }[];
}

export interface ClubAwards {
  id: string;
  name: string;
  club_number: string | null;
  members: number;
  awards: AwardScore[];
  overallPct: number;
}

const CLUB_EXCELLENCE: AwardCriterion[] = [
  { key: 'member_net',     label: 'Net member growth',       threshold: 2,  unit: 'members', hint: 'Inducted minus dropped over the year' },
  { key: 'activities',     label: 'Service activities',       threshold: 12, unit: 'count',   hint: 'At least monthly' },
  { key: 'beneficiaries',  label: 'Beneficiaries served',     threshold: 500, unit: 'count' },
  { key: 'service_hours',  label: 'Volunteer hours',          threshold: 250, unit: 'hours' },
  { key: 'dues_compliance', label: 'No outstanding dues',     threshold: 1,  unit: 'binary', hint: 'All invoices paid' },
];

const PRESIDENTS_100: AwardCriterion[] = [
  { key: 'attendance',     label: 'Attendance ≥ 75%',         threshold: 75, unit: 'percent' },
  { key: 'reports_on_time', label: 'Reports on time',         threshold: 1,  unit: 'binary' },
  { key: 'activities',     label: 'Service activities',       threshold: 10, unit: 'count' },
  { key: 'dues_compliance', label: 'Zero overdue dues',       threshold: 1,  unit: 'binary' },
];

const DG_HONOR: AwardCriterion[] = [
  { key: 'members',         label: 'Active members',          threshold: 25, unit: 'members' },
  { key: 'new_members',     label: 'New inductions (12m)',    threshold: 5,  unit: 'count' },
  { key: 'activities',      label: 'Service activities',      threshold: 20, unit: 'count' },
  { key: 'beneficiaries',   label: 'Beneficiaries served',    threshold: 1000, unit: 'count' },
];

export async function getZoneAwardEligibility(zoneId: string): Promise<ClubAwards[]> {
  const db = createAdminClient();
  const { data: clubs } = await db.from('clubs')
    .select('id, name, club_number')
    .eq('zone_id', zoneId).is('deleted_at', null).order('name');
  if (!clubs?.length) return [];

  const clubIds = clubs.map((c) => c.id);
  const since365 = new Date(Date.now() - 365 * 86400_000).toISOString();
  const since60  = new Date(Date.now() - 60 * 86400_000).toISOString();

  const [
    { data: members },
    { data: acts },
    { data: attendance },
    { data: dues },
  ] = await Promise.all([
    db.from('members').select('id, club_id, joined_at, created_at')
      .in('club_id', clubIds).is('deleted_at', null),
    db.from('activities').select('club_id, beneficiaries, service_hours, date')
      .in('club_id', clubIds).gte('date', since365.slice(0, 10)),
    db.from('attendance').select('member_id, status, occurred_at').gte('occurred_at', since60),
    db.from('dues_invoices').select('club_id, status, amount, paid_amount')
      .in('club_id', clubIds).neq('status', 'paid').then(
        (r) => r,
        () => ({ data: [] as { club_id: string | null; status: string; amount: number; paid_amount: number | null }[] }),
      ),
  ]);

  const memberToClub = new Map<string, string>();
  for (const m of (members ?? [])) if (m.club_id) memberToClub.set(m.id, m.club_id);

  const result: ClubAwards[] = clubs.map((c) => {
    const clubMembers = (members ?? []).filter((m) => m.club_id === c.id);
    const clubActs    = (acts ?? []).filter((a) => a.club_id === c.id);
    const newMembers  = clubMembers.filter((m) => {
      const j = m.joined_at ?? m.created_at;
      return j && new Date(j).toISOString() >= since365;
    }).length;
    const beneficiaries = clubActs.reduce((a, x) => a + (x.beneficiaries ?? 0), 0);
    const serviceHours  = Math.round(clubActs.reduce((a, x) => a + Number(x.service_hours ?? 0), 0));
    const overdueDues = ((dues as { club_id: string | null }[]) ?? []).some((d) => d.club_id === c.id) ? 0 : 1;

    const clubAtt = (attendance ?? []).filter((a) => memberToClub.get(a.member_id) === c.id);
    const attTotal = clubAtt.length;
    const attPresent = clubAtt.filter((a) => a.status === 'present' || a.status === 'remote').length;
    const attendancePct = attTotal ? Math.round((attPresent / attTotal) * 100) : 0;

    const facts: Record<string, number> = {
      members:         clubMembers.length,
      member_net:      newMembers,   // approximate — no drops tracked
      new_members:     newMembers,
      activities:      clubActs.length,
      beneficiaries,
      service_hours:   serviceHours,
      dues_compliance: overdueDues,
      attendance:      attendancePct,
      reports_on_time: 1,            // approximated — assume on time when no overdue alerts
    };

    const awards: AwardScore[] = [
      scoreAward('club_excellence', 'Club Excellence Award', CLUB_EXCELLENCE, facts),
      scoreAward('presidents_100',  "100% President's Award", PRESIDENTS_100, facts),
      scoreAward('dg_honor',        'DG Honor Citation',     DG_HONOR, facts),
    ];
    const overallPct = Math.round(awards.reduce((a, x) => a + x.percent, 0) / awards.length);

    return { id: c.id, name: c.name, club_number: c.club_number, members: clubMembers.length, awards, overallPct };
  });

  result.sort((a, b) => b.overallPct - a.overallPct);
  return result;
}

function scoreAward(
  key: string, label: string, criteria: AwardCriterion[], facts: Record<string, number>,
): AwardScore {
  const checks = criteria.map((c) => {
    const current = facts[c.key] ?? 0;
    return { criterion: c, current, met: current >= c.threshold };
  });
  const metCount = checks.filter((x) => x.met).length;
  const percent = Math.round((metCount / checks.length) * 100);
  return { key, label, eligible: metCount === checks.length, percent, criteria: checks };
}
