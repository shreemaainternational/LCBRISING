import Link from 'next/link';
import { requireDistrictGovernor, getRegionRollups } from '@/lib/district-portal';
import { DistrictTabs } from '../DistrictTabs';

export const dynamic = 'force-dynamic';

export default async function DistrictRegionsPage() {
  const ctx = await requireDistrictGovernor();
  const rows = await getRegionRollups(ctx.district.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Regions in District {ctx.district.code}</h2>
        <p className="text-gray-600 text-sm mt-1">{rows.length} regions · governs {rows.reduce((a, b) => a + b.zones, 0)} zones</p>
      </div>
      <DistrictTabs />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Region</th>
              <th className="text-right p-3">Zones</th>
              <th className="text-right p-3">Clubs</th>
              <th className="text-right p-3">Members</th>
              <th className="text-right p-3">Activities</th>
              <th className="text-right p-3">Avg Health</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">No regions yet — define them at <Link href="/admin/districts" className="text-amber-600 underline">/admin/districts</Link></td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-500">{i + 1}</td>
                <td className="p-3">
                  <div className="font-semibold text-navy-800">{r.name}</div>
                  <div className="text-xs text-gray-500">Region {r.code}</div>
                </td>
                <td className="p-3 text-right tabular-nums">{r.zones}</td>
                <td className="p-3 text-right tabular-nums">{r.clubs}</td>
                <td className="p-3 text-right tabular-nums">{r.members}</td>
                <td className="p-3 text-right tabular-nums">{r.activities}</td>
                <td className={`p-3 text-right font-bold ${r.avgHealth == null ? 'text-gray-400'
                    : r.avgHealth >= 70 ? 'text-emerald-600'
                    : r.avgHealth >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {r.avgHealth ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
