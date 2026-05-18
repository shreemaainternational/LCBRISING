import { requireRegionChair, getRegionKpis, getZoneScores } from '@/lib/region-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await requireRegionChair();
  const kpis = await getRegionKpis(ctx.region.id);
  const scores = await getZoneScores(ctx.region.id);

  const rows = [
    ['Region Report', ctx.region.name],
    ['District', ctx.district?.code ?? ''],
    ['Generated', new Date().toISOString()],
    [],
    ['Region KPIs'],
    ['Zones',           String(kpis.zones)],
    ['Clubs',           String(kpis.clubs)],
    ['Members',         String(kpis.members)],
    ['Activities',      String(kpis.activities)],
    ['Volunteer Hours', String(kpis.volunteerHours)],
    ['Funds Raised',    String(kpis.fundsRaised)],
    ['Beneficiaries',   String(kpis.beneficiaries)],
    [],
    ['Zone Performance'],
    ['Rank', 'Zone Code', 'Zone Name', 'Clubs', 'Members', 'Activities', 'Attendance %', 'Score'],
    ...scores.map((z, i) => [
      String(i + 1), z.code, z.name,
      String(z.clubs), String(z.members), String(z.activities),
      `${z.attendancePct}%`, String(z.score),
    ]),
  ];

  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="region-${ctx.region.code}-${Date.now()}.csv"`,
    },
  });
}
