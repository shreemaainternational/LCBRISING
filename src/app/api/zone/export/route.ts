import { requireZoneChair, getZoneKpis, getClubScores } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/zone/export — CSV summary download. */
export async function GET() {
  const ctx = await requireZoneChair();
  const { kpis } = await getZoneKpis(ctx.zone.id);
  const scores = await getClubScores(ctx.zone.id);

  const rows = [
    ['Zone Report', ctx.zone.name],
    ['District', ctx.district?.code ?? ''],
    ['Generated', new Date().toISOString()],
    [],
    ['Zone KPIs'],
    ['Clubs', String(kpis.clubs)],
    ['Members', String(kpis.members)],
    ['Activities', String(kpis.activities)],
    ['Volunteer Hours', String(kpis.volunteerHours)],
    ['Funds Raised (INR)', String(kpis.fundsRaised)],
    ['Beneficiaries', String(kpis.beneficiaries)],
    [],
    ['Club Performance Rankings'],
    ['Rank', 'Club', 'Club Number', 'Members', 'Activities', 'Attendance %', 'Score'],
    ...scores.map((c, i) => [
      String(i + 1), c.name, c.club_number ?? '',
      String(c.members), String(c.activities),
      `${c.attendancePct}%`, String(c.score),
    ]),
  ];

  const csv = rows.map((r) => r.map((cell) => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="zone-${ctx.zone.code}-${Date.now()}.csv"`,
    },
  });
}
