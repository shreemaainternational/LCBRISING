/**
 * Computes a 0-100 club health score and risk classification from
 * the operational data the platform already collects. Pure functions
 * — no AI required — so health scoring works whether or not OpenAI
 * is configured. AI commentary is layered on top when available.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { env, integrations } from '@/lib/env';

export type ClubRiskLevel = 'thriving' | 'healthy' | 'watch' | 'at_risk' | 'critical';

export interface ClubHealthBreakdown {
  membership: number;
  attendance: number;
  activity: number;
  finance: number;
  compliance: number;
}

export interface ClubHealthAssessment {
  clubId: string;
  score: number;
  risk: ClubRiskLevel;
  breakdown: ClubHealthBreakdown;
  flags: string[];
  metrics: {
    members: number;
    activeMembers: number;
    lapsedMembers: number;
    pendingMembers: number;
    attendancePct: number;
    activitiesLast90d: number;
    beneficiariesLast90d: number;
    fundsRaisedLast90d: number;
    duesPending: number;
    avgVolunteerHours: number;
    reportingCadenceDays: number | null;
  };
  commentary?: string | null;
  assessedAt: string;
}

interface ClubInput {
  id: string;
  name: string;
  club_number: string | null;
}

function classify(score: number): ClubRiskLevel {
  if (score >= 85) return 'thriving';
  if (score >= 70) return 'healthy';
  if (score >= 50) return 'watch';
  if (score >= 30) return 'at_risk';
  return 'critical';
}

const WEIGHTS = {
  membership: 0.25,
  attendance: 0.25,
  activity:   0.25,
  finance:    0.15,
  compliance: 0.10,
};

/** Score a single club from raw operational counts. */
export async function assessClubHealth(clubId: string): Promise<ClubHealthAssessment | null> {
  const db = createAdminClient();
  const { data: club } = await db.from('clubs').select('id, name, club_number').eq('id', clubId).maybeSingle();
  if (!club) return null;
  return await assessFromClub(club as ClubInput);
}

async function assessFromClub(club: ClubInput): Promise<ClubHealthAssessment> {
  const db = createAdminClient();
  const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
  const since60 = new Date(Date.now() - 60 * 86400_000).toISOString();

  const [{ data: members }, { data: acts }, { data: vols }, { data: dues }, { data: attendance }, { data: lastAct }] = await Promise.all([
    db.from('members').select('id, status').eq('club_id', club.id).is('deleted_at', null),
    db.from('activities').select('beneficiaries, amount_raised, sponsorship_amount, service_hours, date').eq('club_id', club.id).gte('date', since90.slice(0, 10)),
    db.from('volunteer_logs').select('hours, member_id'),
    db.from('dues').select('amount, status').eq('status', 'pending'),
    db.from('attendance').select('status, member_id, occurred_at').gte('occurred_at', since60),
    db.from('activities').select('date').eq('club_id', club.id).order('date', { ascending: false }).limit(1),
  ]);

  const totalMembers = members?.length ?? 0;
  const activeMembers = (members ?? []).filter((m) => m.status === 'active').length;
  const lapsedMembers = (members ?? []).filter((m) => m.status === 'lapsed').length;
  const pendingMembers = (members ?? []).filter((m) => m.status === 'pending').length;

  const memberIds = new Set((members ?? []).map((m) => m.id));
  const clubAtt = (attendance ?? []).filter((a) => memberIds.has(a.member_id));
  const presentCount = clubAtt.filter((a) => a.status === 'present' || a.status === 'remote').length;
  const attendancePct = clubAtt.length ? Math.round((presentCount / clubAtt.length) * 100) : 0;

  const activitiesLast90d = acts?.length ?? 0;
  const beneficiariesLast90d = (acts ?? []).reduce((a, b) => a + (b.beneficiaries ?? 0), 0);
  const fundsLast90d = (acts ?? []).reduce((a, b) => a + Number(b.amount_raised ?? 0) + Number(b.sponsorship_amount ?? 0), 0);
  const activityHours = (acts ?? []).reduce((a, b) => a + Number(b.service_hours ?? 0), 0);

  const duesPendingCount = (dues ?? []).length;
  const avgVolHours = activeMembers ? activityHours / activeMembers : 0;
  const lastActivityDate = lastAct?.[0]?.date ? new Date(lastAct[0].date as string) : null;
  const reportingCadenceDays = lastActivityDate ? Math.floor((Date.now() - lastActivityDate.getTime()) / 86400_000) : null;

  // ------------ Sub-scores ----------------------------------------
  // Membership: penalise high lapse, reward growth and active ratio.
  const activeRatio = totalMembers ? activeMembers / totalMembers : 0;
  const lapseRatio  = totalMembers ? lapsedMembers / totalMembers : 0;
  const sizeBoost   = Math.min(1, totalMembers / 25); // healthy floor ~25 members
  const membership = Math.round(100 * Math.max(0, sizeBoost * (0.8 * activeRatio + 0.2 * (1 - lapseRatio))));

  // Attendance: % directly.
  const attendance_score = attendancePct;

  // Activity: 6+ activities in 90d = full marks, log scale below.
  const activity = Math.round(Math.min(100, activitiesLast90d * 16.6));

  // Finance: penalise pending dues, reward $/member/month.
  const fundsPerMember = activeMembers ? fundsLast90d / activeMembers : 0;
  const duesPenalty = Math.min(40, duesPendingCount * 4);
  const finance = Math.max(0, Math.round(50 + Math.min(50, fundsPerMember / 200) - duesPenalty));

  // Compliance: cadence + officer completeness proxy.
  const cadenceScore = reportingCadenceDays == null
    ? 0
    : reportingCadenceDays <= 30 ? 100
    : reportingCadenceDays <= 60 ? 70
    : reportingCadenceDays <= 90 ? 40
    : 10;
  const compliance = cadenceScore;

  const breakdown: ClubHealthBreakdown = { membership, attendance: attendance_score, activity, finance, compliance };

  const score = Math.round(
    breakdown.membership * WEIGHTS.membership +
    breakdown.attendance * WEIGHTS.attendance +
    breakdown.activity   * WEIGHTS.activity +
    breakdown.finance    * WEIGHTS.finance +
    breakdown.compliance * WEIGHTS.compliance,
  );

  // ------------ Flags ---------------------------------------------
  const flags: string[] = [];
  if (totalMembers < 15)         flags.push('Roster below charter threshold');
  if (lapseRatio > 0.2)          flags.push(`Lapsed rate ${Math.round(lapseRatio * 100)}%`);
  if (attendancePct < 40)        flags.push(`Attendance only ${attendancePct}% (last 60d)`);
  if (activitiesLast90d === 0)   flags.push('No activities logged in 90 days');
  if (reportingCadenceDays && reportingCadenceDays > 60) flags.push(`Last activity ${reportingCadenceDays} days ago`);
  if (duesPendingCount > 0)      flags.push(`${duesPendingCount} pending dues invoice${duesPendingCount === 1 ? '' : 's'}`);
  if (activeMembers > 0 && avgVolHours < 1) flags.push('Volunteer-hour engagement is low');

  return {
    clubId: club.id,
    score,
    risk: classify(score),
    breakdown,
    flags,
    metrics: {
      members: totalMembers,
      activeMembers,
      lapsedMembers,
      pendingMembers,
      attendancePct,
      activitiesLast90d,
      beneficiariesLast90d,
      fundsRaisedLast90d: fundsLast90d,
      duesPending: duesPendingCount,
      avgVolunteerHours: Math.round(avgVolHours * 10) / 10,
      reportingCadenceDays,
    },
    assessedAt: new Date().toISOString(),
  };
}

/** Score every club in a zone in parallel. */
export async function assessZoneClubs(zoneId: string): Promise<ClubHealthAssessment[]> {
  const db = createAdminClient();
  const { data: clubs } = await db.from('clubs').select('id, name, club_number').eq('zone_id', zoneId).is('deleted_at', null);
  if (!clubs?.length) return [];
  return Promise.all((clubs as ClubInput[]).map(assessFromClub));
}

export async function assessAllClubs(): Promise<ClubHealthAssessment[]> {
  const db = createAdminClient();
  const { data: clubs } = await db.from('clubs').select('id, name, club_number').is('deleted_at', null);
  if (!clubs?.length) return [];
  // Process in batches of 8 to avoid overwhelming the DB on bigger orgs.
  const results: ClubHealthAssessment[] = [];
  const list = clubs as ClubInput[];
  for (let i = 0; i < list.length; i += 8) {
    const chunk = await Promise.all(list.slice(i, i + 8).map(assessFromClub));
    results.push(...chunk);
  }
  return results;
}

/** Persist score onto the club row. */
export async function persistClubHealth(a: ClubHealthAssessment): Promise<void> {
  const db = createAdminClient();
  await db.from('clubs').update({
    health_score: a.score,
    health_assessed_at: a.assessedAt,
    health_commentary: a.commentary ?? null,
  }).eq('id', a.clubId);
}

/** Optional OpenAI commentary — one-paragraph plain English. */
export async function aiClubCommentary(a: ClubHealthAssessment, clubName: string): Promise<string | null> {
  if (!integrations.openai) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          { role: 'system', content: 'You write concise zone-chair briefings for Lions International clubs. Output ONE plain-text paragraph of 2-4 sentences. No headings, no bullets. Direct, specific, action-oriented.' },
          { role: 'user', content: `Club: ${clubName}\nHealth score: ${a.score}/100 (${a.risk}).\nBreakdown: members ${a.breakdown.membership}, attendance ${a.breakdown.attendance}, activity ${a.breakdown.activity}, finance ${a.breakdown.finance}, compliance ${a.breakdown.compliance}.\nFlags: ${a.flags.join('; ') || 'none'}.\nMetrics: ${a.metrics.members} members (${a.metrics.activeMembers} active, ${a.metrics.lapsedMembers} lapsed). ${a.metrics.attendancePct}% attendance last 60d. ${a.metrics.activitiesLast90d} activities last 90d serving ${a.metrics.beneficiariesLast90d} beneficiaries. ${a.metrics.duesPending} pending dues.\n\nWrite a briefing paragraph the zone chair can act on this week.` },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json() as { choices: { message: { content: string } }[] };
    return j.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export const RISK_META: Record<ClubRiskLevel, { label: string; color: string; chip: string }> = {
  thriving: { label: 'Thriving',  color: '#16A34A', chip: 'bg-emerald-100 text-emerald-700' },
  healthy:  { label: 'Healthy',   color: '#65A30D', chip: 'bg-lime-100 text-lime-700' },
  watch:    { label: 'Watch',     color: '#F59E0B', chip: 'bg-amber-100 text-amber-800' },
  at_risk:  { label: 'At risk',   color: '#EA580C', chip: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical',  color: '#DC2626', chip: 'bg-rose-100 text-rose-700' },
};
