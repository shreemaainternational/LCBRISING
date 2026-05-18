import Link from 'next/link';
import { requireMdChair, getDistrictRollups } from '@/lib/multi-district-portal';
import { MdTabs } from '../MdTabs';

export const dynamic = 'force-dynamic';

export default async function MdDistrictsPage() {
  const ctx = await requireMdChair();
  const rows = await getDistrictRollups(ctx.md.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Districts in MD {ctx.md.code}</h2>
        <p className="text-gray-600 text-sm mt-1">{rows.length} districts · {rows.reduce((a, b) => a + b.clubs, 0)} clubs total</p>
      </div>
      <MdTabs />
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">District</th>
              <th className="text-left p-3">Governor</th>
              <th className="text-right p-3">Regions</th>
              <th className="text-right p-3">Zones</th>
              <th className="text-right p-3">Clubs</th>
              <th className="text-right p-3">Members</th>
              <th className="text-right p-3">Avg Health</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-gray-500">No districts yet</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-500">{i + 1}</td>
                <td className="p-3">
                  <div className="font-semibold text-navy-800">{r.name}</div>
                  <div className="text-xs text-gray-500">District {r.code}</div>
                </td>
                <td className="p-3 text-gray-700">{r.governor_name ?? '—'}</td>
                <td className="p-3 text-right tabular-nums">{r.regions}</td>
                <td className="p-3 text-right tabular-nums">{r.zones}</td>
                <td className="p-3 text-right tabular-nums">{r.clubs}</td>
                <td className="p-3 text-right tabular-nums">{r.members}</td>
                <td className={`p-3 text-right font-bold ${
                  r.avgHealth == null ? 'text-gray-400'
                    : r.avgHealth >= 70 ? 'text-emerald-600'
                    : r.avgHealth >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {r.avgHealth ?? '—'}
                </td>
                <td className="p-3 text-right">
                  <Link href={`/admin/districts/${r.id}`} className="text-xs text-amber-700 hover:text-amber-900">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
