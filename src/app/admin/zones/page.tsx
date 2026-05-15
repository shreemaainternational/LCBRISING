import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { zonesPreset } from '@/components/admin/quick-add-presets';
import { MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Zone = {
  id: string;
  code: string;
  name: string;
  chairperson_name: string | null;
  region_id: string | null;
  district_id: string;
};

type DistrictRef = { id: string; code: string };

export default async function ZonesPage() {
  const supa = await createClient();

  const [zonesRes, districtsRes, clubCountsRes] = await Promise.all([
    supa.from('zones').select('id, code, name, chairperson_name, region_id, district_id')
      .is('deleted_at', null).order('code'),
    supa.from('districts').select('id, code, name').is('deleted_at', null).order('code'),
    supa.from('clubs').select('zone_id').is('deleted_at', null),
  ]);

  const zones = (zonesRes.data ?? []) as Zone[];
  const districts: Record<string, DistrictRef> = Object.fromEntries(
    ((districtsRes.data ?? []) as DistrictRef[]).map((d) => [d.id, d]),
  );
  const clubsByZone = new Map<string, number>();
  for (const c of (clubCountsRes.data ?? []) as { zone_id: string | null }[]) {
    if (c.zone_id) clubsByZone.set(c.zone_id, (clubsByZone.get(c.zone_id) ?? 0) + 1);
  }

  const preset = zonesPreset({ districts: districtsRes.data ?? [] });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Zones</h1>
          <p className="text-gray-600">
            Mid-level federation grouping. A zone holds several clubs within a region;
            a Zone Chairperson oversees them.
          </p>
        </div>
        <QuickAddCard title="Zone" {...preset} />
      </div>

      {zones.length === 0 ? (
        <EmptyState
          icon={<MapPin size={26} />}
          title="No zones yet"
          description="Create your first zone — group several clubs together under a district."
          cta={<QuickAddCard title="Zone" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{zones.length} zones</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">District</th>
                  <th className="text-left p-3">Chairperson</th>
                  <th className="text-right p-3">Clubs</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className="border-t">
                    <td className="p-3 font-mono">
                      <Link href={`/admin/zones/${z.id}`} className="text-navy-700 hover:underline">{z.code}</Link>
                    </td>
                    <td className="p-3 font-medium">{z.name}</td>
                    <td className="p-3 text-gray-600">{districts[z.district_id]?.code ?? '—'}</td>
                    <td className="p-3">{z.chairperson_name ?? '—'}</td>
                    <td className="p-3 text-right">{clubsByZone.get(z.id) ?? 0}</td>
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
