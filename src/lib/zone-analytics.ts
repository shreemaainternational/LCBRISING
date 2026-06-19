/**
 * Cross-club analytics + lightweight predictive trends for the Zone
 * Chairperson portal. No external service required — uses
 * least-squares linear regression over the last 12 months of CRM
 * data to project the next 3 months.
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface MonthlySeries {
  month: string;        // 'YYYY-MM'
  members: number;
  activities: number;
  beneficiaries: number;
  fundsRaised: number;
  serviceHours: number;
}

export interface ClubAnalytics {
  id: string;
  name: string;
  club_number: string | null;
  members: number;
  newMembers30d: number;
  activities30d: number;
  activities365d: number;
  beneficiaries: number;
  fundsRaised: number;
  serviceHours: number;
  attendancePct: number;
  healthScore: number | null;
  duesPending: number;
}

export interface ZonePrediction {
  metric: string;
  current: number;
  forecast3m: number;
  changePct: number;
  trend: 'up' | 'down' | 'flat';
  reason: string;
}

export interface ZoneAnalyticsBundle {
  series: MonthlySeries[];
  clubs: ClubAnalytics[];
  ranking: { id: string; name: string; score: number; rank: number }[];
  predictions: ZonePrediction[];
  totals: {
    members: number;
    activities: number;
    beneficiaries: number;
    fundsRaised: number;
    serviceHours: number;
    duesPending: number;
  };
}

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Least-squares linear regression. Returns {slope, intercept}. */
function linfit(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i; sy += ys[i];
    sxy += i * ys[i]; sxx += i * i;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function project(ys: number[], stepsAhead: number): number {
  const { slope, intercept } = linfit(ys);
  return Math.max(0, intercept + slope * (ys.length - 1 + stepsAhead));
}

export async function getZoneAnalytics(zoneId: string): Promise<ZoneAnalyticsBundle> {
  const db = createAdminClient();
  const { data: clubs } = await db.from('clubs')
    .select('id, name, club_number, health_score')
    .eq('zone_id', zoneId).is('deleted_at', null).order('name');
  const clubList = clubs ?? [];
  const clubIds = clubList.map((c) => c.id);

  if (clubIds.length === 0) {
    return {
      series: [], clubs: [], ranking: [], predictions: [],
      totals: { members: 0, activities: 0, beneficiaries: 0, fundsRaised: 0, serviceHours: 0, duesPending: 0 },
    };
  }

  const since365 = new Date(Date.now() - 365 * 86400_000).toISOString();
  const since60  = new Date(Date.now() - 60 * 86400_000).toISOString();
  const since30  = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [
    { data: members },
    { data: acts },
    { data: attendance },
    { data: dues },
  ] = await Promise.all([
    db.from('members').select('id, club_id, joined_at, created_at')
      .in('club_id', clubIds).is('deleted_at', null),
    db.from('activities').select('id, club_id, date, beneficiaries, amount_raised, sponsorship_amount, service_hours')
      .in('club_id', clubIds).gte('date', since365.slice(0, 10)),
    db.from('attendance').select('member_id, status, occurred_at').gte('occurred_at', since60),
    db.from('dues_invoices').select('club_id, amount, paid_amount, status').in('club_id', clubIds).neq('status', 'paid').then(
      (r) => r,
      () => ({ data: [] as { club_id: string | null; amount: number; paid_amount: number | null; status: string }[] }),
    ),
  ]);

  // member→club for attendance bucketing
  const memberToClub = new Map<string, string>();
  for (const m of members ?? []) if (m.club_id) memberToClub.set(m.id, m.club_id);

  // Per-club aggregates
  const byClub: Record<string, ClubAnalytics> = {};
  for (const c of clubList) {
    byClub[c.id] = {
      id: c.id, name: c.name, club_number: c.club_number,
      members: 0, newMembers30d: 0,
      activities30d: 0, activities365d: 0,
      beneficiaries: 0, fundsRaised: 0, serviceHours: 0,
      attendancePct: 0, healthScore: c.health_score,
      duesPending: 0,
    };
  }
  for (const m of members ?? []) {
    if (!m.club_id || !byClub[m.club_id]) continue;
    byClub[m.club_id].members++;
    const joined = m.joined_at ?? m.created_at;
    if (joined && new Date(joined).toISOString() >= since30) byClub[m.club_id].newMembers30d++;
  }
  for (const a of acts ?? []) {
    if (!a.club_id || !byClub[a.club_id]) continue;
    byClub[a.club_id].activities365d++;
    if (a.date && new Date(a.date).toISOString() >= since30) byClub[a.club_id].activities30d++;
    byClub[a.club_id].beneficiaries += a.beneficiaries ?? 0;
    byClub[a.club_id].fundsRaised += Number(a.amount_raised ?? 0) + Number(a.sponsorship_amount ?? 0);
    byClub[a.club_id].serviceHours += Number(a.service_hours ?? 0);
  }
  const attCounter: Record<string, { present: number; total: number }> = {};
  for (const a of attendance ?? []) {
    const club = memberToClub.get(a.member_id);
    if (!club || !byClub[club]) continue;
    if (!attCounter[club]) attCounter[club] = { present: 0, total: 0 };
    attCounter[club].total++;
    if (a.status === 'present' || a.status === 'remote') attCounter[club].present++;
  }
  for (const id of Object.keys(byClub)) {
    const att = attCounter[id];
    byClub[id].attendancePct = att?.total ? Math.round((att.present / att.total) * 100) : 0;
  }
  for (const d of (dues as { club_id: string | null; amount: number; paid_amount: number | null }[]) ?? []) {
    if (!d.club_id || !byClub[d.club_id]) continue;
    byClub[d.club_id].duesPending += Math.max(0, Number(d.amount ?? 0) - Number(d.paid_amount ?? 0));
  }

  // 12-month time series — zone-wide
  const series: MonthlySeries[] = [];
  const baseDate = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    series.push({ month: ymKey(d), members: 0, activities: 0, beneficiaries: 0, fundsRaised: 0, serviceHours: 0 });
  }
  const seriesIdx = new Map(series.map((s, i) => [s.month, i]));

  for (const m of members ?? []) {
    const j = m.joined_at ?? m.created_at;
    if (!j) continue;
    const key = ymKey(new Date(j));
    const i = seriesIdx.get(key);
    if (i != null) series[i].members++;
  }
  for (const a of acts ?? []) {
    if (!a.date) continue;
    const key = ymKey(new Date(a.date));
    const i = seriesIdx.get(key);
    if (i == null) continue;
    series[i].activities++;
    series[i].beneficiaries += a.beneficiaries ?? 0;
    series[i].fundsRaised  += Number(a.amount_raised ?? 0) + Number(a.sponsorship_amount ?? 0);
    series[i].serviceHours += Number(a.service_hours ?? 0);
  }

  // Cumulative member count per month for trend
  let runningMembers = 0;
  for (const s of series) { runningMembers += s.members; s.members = runningMembers; }
  const totalMembers = Object.values(byClub).reduce((a, c) => a + c.members, 0);
  // If we lost rows because joined_at is null, anchor the last bucket to current count
  if (totalMembers > 0 && series.length) series[series.length - 1].members = totalMembers;

  // Predictions
  const predictions: ZonePrediction[] = [
    predict('Members', series.map((s) => s.members), 3),
    predict('Activities (monthly)', series.map((s) => s.activities), 3),
    predict('Beneficiaries (monthly)', series.map((s) => s.beneficiaries), 3),
    predict('Funds raised (monthly ₹)', series.map((s) => s.fundsRaised), 3),
    predict('Service hours (monthly)', series.map((s) => s.serviceHours), 3),
  ];

  // Composite ranking: 40% activities30d, 25% attendance, 20% size, 15% health (or compliance proxy)
  const clubArray = Object.values(byClub);
  const maxAct = Math.max(1, ...clubArray.map((c) => c.activities30d));
  const maxMem = Math.max(1, ...clubArray.map((c) => c.members));
  const scored = clubArray.map((c) => {
    const score = Math.round(
      (c.activities30d / maxAct) * 100 * 0.40 +
      c.attendancePct * 0.25 +
      (c.members / maxMem) * 100 * 0.20 +
      (c.healthScore ?? 60) * 0.15,
    );
    return { id: c.id, name: c.name, score };
  }).sort((a, b) => b.score - a.score)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  return {
    series,
    clubs: clubArray.sort((a, b) => b.activities30d - a.activities30d),
    ranking: scored,
    predictions,
    totals: {
      members: totalMembers,
      activities: clubArray.reduce((a, c) => a + c.activities365d, 0),
      beneficiaries: clubArray.reduce((a, c) => a + c.beneficiaries, 0),
      fundsRaised: clubArray.reduce((a, c) => a + c.fundsRaised, 0),
      serviceHours: clubArray.reduce((a, c) => a + c.serviceHours, 0),
      duesPending: clubArray.reduce((a, c) => a + c.duesPending, 0),
    },
  };
}

function predict(metric: string, ys: number[], steps: number): ZonePrediction {
  const last3 = ys.slice(-3).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(3, ys.length));
  const next = project(ys, steps);
  const cur = ys[ys.length - 1] ?? 0;
  const baseline = Math.max(1, last3 || cur || 1);
  const changePct = Math.round(((next - baseline) / baseline) * 100);
  const trend: ZonePrediction['trend'] =
    Math.abs(changePct) < 5 ? 'flat' : changePct > 0 ? 'up' : 'down';
  const reason =
    trend === 'flat' ? 'Trend within ±5% — keep steady cadence.' :
    trend === 'up'   ? `Linear fit over 12m projects +${changePct}% by ${steps}m out.` :
                       `Linear fit over 12m projects ${changePct}% by ${steps}m out — investigate.`;
  return { metric, current: Math.round(cur), forecast3m: Math.round(next), changePct, trend, reason };
}
