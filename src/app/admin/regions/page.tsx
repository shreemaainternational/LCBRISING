import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { regionsPreset } from '@/components/admin/quick-add-presets';
import { Map as MapIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Region = { id: string; code: string; name: string; chairperson_name: string | null; district_id: string };
type DistrictRef = { id: string; code: string };

export default async function RegionsPage() {
  // Admin-gated page: service-role read keeps zone/club counts correct even
  // where the members RLS policy is still self-referential.
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [regionsRes, districtsRes, zoneCountsRes, clubCountsRes] = await Promise.all([
    supa.from('regions').select('id, code, name, chairperson_name, district_id').is('deleted_at', null).order('code'),
    supa.from('districts').select('id, code, name').is('deleted_at', null).order('code'),
    supa.from('zones').select('region_id').is('deleted_at', null),
    supa.from('clubs').select('region_id').is('deleted_at', null),
  ]);

  const regions = (regionsRes.data ?? []) as Region[];
  const districts: Record<string, DistrictRef> = Object.fromEntries(
    ((districtsRes.data ?? []) as DistrictRef[]).map((d) => [d.id, d]),
  );
  const zonesByRegion = new Map<string, number>();
  for (const z of (zoneCountsRes.data ?? []) as { region_id: string | null }[]) {
    if (z.region_id) zonesByRegion.set(z.region_id, (zonesByRegion.get(z.region_id) ?? 0) + 1);
  }
  const clubsByRegion = new Map<string, number>();
  for (const c of (clubCountsRes.data ?? []) as { region_id: string | null }[]) {
    if (c.region_id) clubsByRegion.set(c.region_id, (clubsByRegion.get(c.region_id) ?? 0) + 1);
  }

  const preset = regionsPreset({ districts: districtsRes.data ?? [] });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Regions</h1>
          <p className="text-gray-600">
            Top-level federation grouping within a district. A region holds several zones;
            a Region Chairperson oversees them.
          </p>
        </div>
        <QuickAddCard title="Region" {...preset} />
      </div>

      {regions.length === 0 ? (
        <EmptyState
          icon={<MapIcon size={26} />}
          title="No regions yet"
          description="Create your first region — group several zones together under a district."
          cta={<QuickAddCard title="Region" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{regions.length} regions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">District</th>
                  <th className="text-left p-3">Chairperson</th>
                  <th className="text-right p-3">Zones</th>
                  <th className="text-right p-3">Clubs</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-mono">
                      <Link href={`/admin/regions/${r.id}`} className="text-navy-700 hover:underline">{r.code}</Link>
                    </td>
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-gray-600">{districts[r.district_id]?.code ?? '—'}</td>
                    <td className="p-3">{r.chairperson_name ?? '—'}</td>
                    <td className="p-3 text-right">{zonesByRegion.get(r.id) ?? 0}</td>
                    <td className="p-3 text-right">{clubsByRegion.get(r.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
