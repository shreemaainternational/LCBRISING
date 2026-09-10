import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { regionsPreset } from '@/components/admin/quick-add-presets';
import { RegionsTable, type RegionRow } from '@/components/admin/RegionsTable';
import { Map as MapIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Region = {
  id: string;
  code: string;
  name: string;
  chairperson_name: string | null;
  district_id: string;
};
type DistrictRef = { id: string; code: string; name: string };

export default async function RegionsPage() {
  const supa = await createClient();

  const [regionsRes, districtsRes, zoneCountsRes] = await Promise.all([
    supa.from('regions').select('id, code, name, chairperson_name, district_id')
      .is('deleted_at', null).order('code'),
    supa.from('districts').select('id, code, name').is('deleted_at', null).order('code'),
    supa.from('zones').select('region_id').is('deleted_at', null),
  ]);

  const regions = (regionsRes.data ?? []) as Region[];
  const districtOptions = (districtsRes.data ?? []) as DistrictRef[];
  const districts: Record<string, DistrictRef> = Object.fromEntries(districtOptions.map((d) => [d.id, d]));
  const zonesByRegion = new Map<string, number>();
  for (const z of (zoneCountsRes.data ?? []) as { region_id: string | null }[]) {
    if (z.region_id) zonesByRegion.set(z.region_id, (zonesByRegion.get(z.region_id) ?? 0) + 1);
  }

  const regionRows: RegionRow[] = regions.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    chairperson_name: r.chairperson_name,
    district_id: r.district_id,
    district_code: districts[r.district_id]?.code ?? null,
    zone_count: zonesByRegion.get(r.id) ?? 0,
  }));

  const preset = regionsPreset({ districts: districtOptions });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Regions</h1>
          <p className="text-gray-600">
            Upper-mid federation grouping in the Lions hierarchy (District → Region → Zone →
            Club → Member). A region groups several zones under a Region Chairperson.
          </p>
        </div>
        <QuickAddCard title="Region" {...preset} />
      </div>

      {regionRows.length === 0 ? (
        <EmptyState
          icon={<MapIcon size={26} />}
          title="No regions yet"
          description="Create your first region — group several zones together under a district."
          cta={<QuickAddCard title="Region" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{regionRows.length} regions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <RegionsTable regions={regionRows} districts={districtOptions} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
