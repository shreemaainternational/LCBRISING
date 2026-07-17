import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { zonesPreset } from '@/components/admin/quick-add-presets';
import { ZonesTable, type ZoneRow } from '@/components/admin/ZonesTable';
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

type DistrictRef = { id: string; code: string; name: string };

export default async function ZonesPage() {
  // Read via the service-role client (gated by the admin layout) so the zones
  // list survives databases where the `members` RLS policy recurses; fall back
  // to the SSR session when no service-role key is set.
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [zonesRes, districtsRes, clubCountsRes] = await Promise.all([
    supa.from('zones').select('id, code, name, chairperson_name, region_id, district_id')
      .is('deleted_at', null).order('code'),
    supa.from('districts').select('id, code, name').is('deleted_at', null).order('code'),
    supa.from('clubs').select('zone_id').is('deleted_at', null),
  ]);

  const zones = (zonesRes.data ?? []) as Zone[];
  const districtOptions = (districtsRes.data ?? []) as DistrictRef[];
  const districts: Record<string, DistrictRef> = Object.fromEntries(
    districtOptions.map((d) => [d.id, d]),
  );
  const clubsByZone = new Map<string, number>();
  for (const c of (clubCountsRes.data ?? []) as { zone_id: string | null }[]) {
    if (c.zone_id) clubsByZone.set(c.zone_id, (clubsByZone.get(c.zone_id) ?? 0) + 1);
  }

  const zoneRows: ZoneRow[] = zones.map((z) => ({
    id: z.id,
    code: z.code,
    name: z.name,
    chairperson_name: z.chairperson_name,
    district_id: z.district_id,
    district_code: districts[z.district_id]?.code ?? null,
    club_count: clubsByZone.get(z.id) ?? 0,
  }));

  const preset = zonesPreset({ districts: districtOptions });

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
          <CardHeader><CardTitle>{zoneRows.length} zones</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ZonesTable zones={zoneRows} districts={districtOptions} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
