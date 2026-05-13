import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

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

  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-800 mb-1">Districts</h1>
      <p className="text-gray-600 mb-8">
        Lions federation hierarchy. Click a district to drill into clubs, officers, and analytics.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{rows.length} districts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No districts yet. Run the federation bootstrap SQL or import via CSV.
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
