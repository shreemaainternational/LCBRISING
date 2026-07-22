import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { districtsPreset } from '@/components/admin/quick-add-presets';
import { DistrictsTable, type DistrictRow } from '@/components/admin/DistrictsTable';
import { Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DistrictsPage() {
  // Read via the service-role client (this page is gated by the admin layout)
  // so the district list survives databases where the `members` RLS policy
  // recurses; fall back to the SSR session when no service-role key is set.
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data: districts } = await supa
    .from('districts')
    .select('id, code, name, governor_name, cabinet_secretary_name, cabinet_treasurer_name, lions_year, multiple_district_id')
    .is('deleted_at', null)
    .order('code');

  const [{ data: clubCounts }, { data: mdRows }] = await Promise.all([
    supa.from('clubs').select('district_id').is('deleted_at', null),
    supa.from('multiple_districts').select('id, code, name').is('deleted_at', null).order('code'),
  ]);
  const mds = (mdRows ?? []) as { id: string; code: string; name: string }[];

  const clubsByDistrict = new Map<string, number>();
  for (const c of clubCounts ?? []) {
    if (c.district_id) {
      clubsByDistrict.set(c.district_id, (clubsByDistrict.get(c.district_id) ?? 0) + 1);
    }
  }

  const rows: DistrictRow[] = (districts ?? []).map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    governor_name: d.governor_name ?? null,
    cabinet_secretary_name: d.cabinet_secretary_name ?? null,
    cabinet_treasurer_name: d.cabinet_treasurer_name ?? null,
    lions_year: d.lions_year ?? null,
    multiple_district_id: d.multiple_district_id ?? null,
    club_count: clubsByDistrict.get(d.id) ?? 0,
  }));
  const preset = districtsPreset();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Districts</h1>
          <p className="text-gray-600">
            Lions federation hierarchy. Click a district to drill into clubs, officers, and analytics.
          </p>
        </div>
        <QuickAddCard title="District" {...preset} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Globe size={26} />}
          title="No districts yet"
          description="Add your first district below. You can also bulk-import via CSV or sync directly from MyLCI under Sync → Lions."
          cta={<QuickAddCard title="District" {...preset} />}
          hint={<>Tip: District codes look like <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">3232 F1</code></>}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{rows.length} districts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DistrictsTable districts={rows} mds={mds} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
