import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { multipleDistrictsPreset } from '@/components/admin/quick-add-presets';
import { MultipleDistrictsTable, type MdRow } from '@/components/admin/MultipleDistrictsTable';
import { Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Md = {
  id: string;
  code: string;
  name: string;
  country: string | null;
  council_chairperson_name: string | null;
  constitutional_area_id: string | null;
};

export default async function MultipleDistrictsPage() {
  // Read via the service-role client (this page is gated by the admin layout).
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();

  const [{ data: mds }, { data: districts }, { data: cas }] = await Promise.all([
    supa.from('multiple_districts').select('id, code, name, country, council_chairperson_name, constitutional_area_id')
      .is('deleted_at', null).order('code'),
    supa.from('districts').select('multiple_district_id').is('deleted_at', null),
    supa.from('constitutional_areas').select('id, code, name').is('deleted_at', null).order('code'),
  ]);

  const districtCount = new Map<string, number>();
  for (const d of (districts ?? []) as { multiple_district_id: string | null }[]) {
    if (d.multiple_district_id) districtCount.set(d.multiple_district_id, (districtCount.get(d.multiple_district_id) ?? 0) + 1);
  }

  const caOptions = (cas ?? []) as { id: string; code: string; name: string }[];
  const rows: MdRow[] = ((mds ?? []) as Md[]).map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    country: m.country,
    council_chairperson_name: m.council_chairperson_name,
    constitutional_area_id: m.constitutional_area_id ?? null,
    district_count: districtCount.get(m.id) ?? 0,
  }));

  const preset = multipleDistrictsPreset();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Multiple Districts</h1>
          <p className="text-gray-600">
            Top of the Lions federation hierarchy (Multiple District → District → Region → Zone →
            Club → Member). A Council Chairperson oversees the multiple district.
          </p>
        </div>
        <QuickAddCard title="Multiple District" {...preset} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Layers size={26} />}
          title="No multiple districts yet"
          description="Create the multiple district (e.g. MD 323) that your districts roll up into."
          cta={<QuickAddCard title="Multiple District" {...preset} />}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{rows.length} multiple districts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <MultipleDistrictsTable rows={rows} cas={caOptions} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
