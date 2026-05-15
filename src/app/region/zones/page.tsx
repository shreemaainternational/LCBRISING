import Link from 'next/link';
import { requireRegionChair, getZoneScores } from '@/lib/region-portal';
import { RegionTabs } from '../RegionTabs';

export const dynamic = 'force-dynamic';

export default async function RegionZonesPage() {
  const ctx = await requireRegionChair();
  const scores = await getZoneScores(ctx.region.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Zones in {ctx.region.name}</h2>
        <p className="text-gray-600 text-sm mt-1">{scores.length} zones · District {ctx.district?.code}</p>
      </div>
      <RegionTabs />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Zone</th>
              <th className="text-right p-3">Clubs</th>
              <th className="text-right p-3">Members</th>
              <th className="text-right p-3">Activities</th>
              <th className="text-right p-3">Attendance</th>
              <th className="text-right p-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">No zones yet</td></tr>
            ) : scores.map((z, i) => (
              <tr key={z.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-500">{i + 1}</td>
                <td className="p-3">
                  <Link href={`/admin/zones/${z.id}`} className="font-semibold text-navy-800 hover:underline">{z.name}</Link>
                  <div className="text-xs text-gray-500">Zone {z.code}</div>
                </td>
                <td className="p-3 text-right tabular-nums">{z.clubs}</td>
                <td className="p-3 text-right tabular-nums">{z.members}</td>
                <td className="p-3 text-right tabular-nums">{z.activities}</td>
                <td className="p-3 text-right tabular-nums">{z.attendancePct}%</td>
                <td className={`p-3 text-right font-bold ${z.score >= 70 ? 'text-emerald-600' : z.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {z.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
