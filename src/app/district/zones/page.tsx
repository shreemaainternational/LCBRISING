import Link from 'next/link';
import { requireDistrictGovernor } from '@/lib/district-portal';
import { DistrictTabs } from '../DistrictTabs';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DistrictZonesPage() {
  const ctx = await requireDistrictGovernor();
  const db = createAdminClient();
  const [{ data: zones }, { data: clubs }] = await Promise.all([
    db.from('zones').select('id, code, name, chairperson_name, region_id, chairperson_member_id')
      .eq('district_id', ctx.district.id).is('deleted_at', null).order('code'),
    db.from('clubs').select('id, zone_id').eq('district_id', ctx.district.id).is('deleted_at', null),
  ]);

  const clubCount = new Map<string, number>();
  for (const c of clubs ?? []) {
    if (c.zone_id) clubCount.set(c.zone_id, (clubCount.get(c.zone_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Zones in District {ctx.district.code}</h2>
        <p className="text-gray-600 text-sm mt-1">{zones?.length ?? 0} zones</p>
      </div>
      <DistrictTabs />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Chairperson</th>
              <th className="text-right p-3">Clubs</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!zones?.length ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">No zones yet</td></tr>
            ) : zones.map((z) => (
              <tr key={z.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono">{z.code}</td>
                <td className="p-3 font-semibold">{z.name}</td>
                <td className="p-3 text-gray-700">{z.chairperson_name ?? '—'}</td>
                <td className="p-3 text-right tabular-nums">{clubCount.get(z.id) ?? 0}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/zones/${z.id}`} className="text-xs text-amber-700 hover:text-amber-900">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
