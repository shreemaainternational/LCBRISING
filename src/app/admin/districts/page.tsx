import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { districtsPreset } from '@/components/admin/quick-add-presets';
import { Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';

type DistrictRow = {
  id: string;
  code: string;
  name: string;
  governor_name: string | null;
  lions_year: string | null;
  multiple_district_id: string | null;
};

export default async function DistrictsPage() {
  const supa = await createClient();
  const { data: districts } = await supa
    .from('districts')
    .select('id, code, name, governor_name, lions_year, multiple_district_id')
    .is('deleted_at', null)
    .order('code');

  const { data: clubCounts } = await supa
    .from('clubs')
    .select('district_id')
    .is('deleted_at', null);

  const clubsByDistrict = new Map<string, number>();
  for (const c of clubCounts ?? []) {
    if (c.district_id) {
      clubsByDistrict.set(c.district_id, (clubsByDistrict.get(c.district_id) ?? 0) + 1);
    }
  }

  const rows = (districts ?? []) as DistrictRow[];
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
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Governor</th>
                  <th className="text-left p-3">Lions year</th>
                  <th className="text-right p-3">Clubs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-3 font-mono">
                      <Link href={`/admin/districts/${d.id}`} className="text-navy-700 hover:underline">
                        {d.code}
                      </Link>
                    </td>
                    <td className="p-3 font-medium">{d.name}</td>
                    <td className="p-3">{d.governor_name ?? '—'}</td>
                    <td className="p-3 text-gray-500">{d.lions_year ?? '—'}</td>
                    <td className="p-3 text-right tabular-nums">{clubsByDistrict.get(d.id) ?? 0}</td>
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
