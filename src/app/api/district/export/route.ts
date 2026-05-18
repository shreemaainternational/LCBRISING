import { requireDistrictGovernor, getDistrictKpis, getRegionRollups } from '@/lib/district-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await requireDistrictGovernor();
  const kpis = await getDistrictKpis(ctx.district.id);
  const rollups = await getRegionRollups(ctx.district.id);

  const rows = [
    ['District Report', `District ${ctx.district.code} · ${ctx.district.name}`],
    ['Lions Year', ctx.district.lions_year ?? ''],
    ['Governor', ctx.district.governor_name ?? ''],
    ['Generated', new Date().toISOString()],
    [],
    ['District KPIs'],
    ['Regions',          String(kpis.regions)],
    ['Zones',            String(kpis.zones)],
    ['Clubs',            String(kpis.clubs)],
    ['Members',          String(kpis.members)],
    ['Activities',       String(kpis.activities)],
    ['Volunteer Hours',  String(kpis.volunteerHours)],
    ['Funds Raised',     String(kpis.fundsRaised)],
    ['Beneficiaries',    String(kpis.beneficiaries)],
    ['Critical clubs',   String(kpis.criticalClubs)],
    [],
    ['Region Roll-up'],
    ['Code', 'Name', 'Zones', 'Clubs', 'Members', 'Activities', 'Avg Health'],
    ...rollups.map((r) => [
      r.code, r.name, String(r.zones), String(r.clubs),
      String(r.members), String(r.activities),
      r.avgHealth == null ? '' : String(r.avgHealth),
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
      'Content-Disposition': `attachment; filename="district-${ctx.district.code}-${Date.now()}.csv"`,
    },
  });
}
