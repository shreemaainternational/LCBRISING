import Link from 'next/link';
import { requireZoneChair, getClubScores } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { Building2, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ZoneClubsPage() {
  const ctx = await requireZoneChair();
  const scores = await getClubScores(ctx.zone.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Clubs in {ctx.zone.name}</h2>
        <p className="text-gray-600 text-sm inline-flex items-center gap-1 mt-1">
          <MapPin size={13} /> {ctx.district?.code} · {scores.length} clubs
        </p>
      </div>

      <ZoneTabs />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Club</th>
              <th className="text-right p-3">Members</th>
              <th className="text-right p-3">Activities</th>
              <th className="text-right p-3">Attendance</th>
              <th className="text-right p-3">Score</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">No clubs yet</td></tr>
            ) : scores.map((c, i) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-bold text-gray-500">{i + 1}</td>
                <td className="p-3">
                  <div className="font-semibold text-navy-800 inline-flex items-center gap-1.5">
                    <Building2 size={13} className="text-blue-500" /> {c.name}
                  </div>
                  <div className="text-xs text-gray-500">Club #{c.club_number ?? '—'}</div>
                </td>
                <td className="p-3 text-right tabular-nums">{c.members}</td>
                <td className="p-3 text-right tabular-nums">{c.activities}</td>
                <td className="p-3 text-right tabular-nums">{c.attendancePct}%</td>
                <td className={`p-3 text-right font-bold ${c.score >= 70 ? 'text-emerald-600' : c.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {c.score}
                </td>
                <td className="p-3 text-right">
                  <Link href={`/admin/clubs/${c.id}`} className="text-xs text-amber-700 hover:text-amber-900">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
