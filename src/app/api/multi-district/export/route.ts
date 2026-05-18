import { requireMdChair, getMdKpis, getDistrictRollups } from '@/lib/multi-district-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await requireMdChair();
  const kpis = await getMdKpis(ctx.md.id);
  const rollups = await getDistrictRollups(ctx.md.id);

  const rows: (string | number | null | undefined)[][] = [
    ['Multiple-District Report', `${ctx.md.code} · ${ctx.md.name}`],
    ['Country', ctx.md.country ?? ''],
    ['Council Chairperson', ctx.md.council_chairperson_name ?? ''],
    ['Generated', new Date().toISOString()],
    [],
    ['MD KPIs'],
    ['Districts',        String(kpis.districts)],
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
    ['District Roll-up'],
    ['Code', 'Name', 'Governor', 'Regions', 'Zones', 'Clubs', 'Members', 'Activities', 'Avg Health'],
    ...rollups.map((r) => [
      r.code, r.name, r.governor_name ?? '',
      String(r.regions), String(r.zones), String(r.clubs),
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
      'Content-Disposition': `attachment; filename="md-${ctx.md.code.replace(/\s+/g, '_')}-${Date.now()}.csv"`,
    },
  });
}
