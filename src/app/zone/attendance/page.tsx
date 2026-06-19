import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Module-scoped so the current-time read is not flagged as impure render work.
function isoSince(msAgo: number) {
  return new Date(Date.now() - msAgo).toISOString();
}

export default async function ZoneAttendancePage() {
  const ctx = await requireZoneChair();
  const db = createAdminClient();

  const { data: clubs } = await db.from('clubs').select('id, name').eq('zone_id', ctx.zone.id).is('deleted_at', null);
  const clubIds = (clubs ?? []).map((c) => c.id);

  const { data: members } = await db.from('members').select('id, name, club_id').in('club_id', clubIds.length ? clubIds : ['00000000-0000-0000-0000-000000000000']);
  const memberIds = (members ?? []).map((m) => m.id);

  const since = isoSince(60 * 86400_000);
  const { data: attendance } = await db.from('attendance')
    .select('member_id, status, occurred_at')
    .gte('occurred_at', since)
    .in('member_id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']);

  const byMember = new Map<string, { present: number; total: number }>();
  for (const a of attendance ?? []) {
    const cur = byMember.get(a.member_id) ?? { present: 0, total: 0 };
    cur.total++;
    if (a.status === 'present' || a.status === 'remote') cur.present++;
    byMember.set(a.member_id, cur);
  }

  const memberToClub = new Map<string, { name: string; clubName: string }>();
  const clubName = new Map((clubs ?? []).map((c) => [c.id, c.name]));
  for (const m of members ?? []) memberToClub.set(m.id, { name: m.name, clubName: clubName.get(m.club_id!) ?? '—' });

  const rows = [...byMember.entries()]
    .map(([id, agg]) => ({
      id,
      ...memberToClub.get(id)!,
      ...agg,
      pct: agg.total ? Math.round((agg.present / agg.total) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Attendance · last 60 days</h2>
        <p className="text-gray-600 text-sm mt-1">Members across {clubs?.length ?? 0} clubs in {ctx.zone.name}</p>
      </div>
      <ZoneTabs />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Member</th>
              <th className="text-left p-3">Club</th>
              <th className="text-right p-3">Present</th>
              <th className="text-right p-3">Total</th>
              <th className="text-right p-3">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">No attendance records in this window</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-gray-600">{r.clubName}</td>
                <td className="p-3 text-right tabular-nums">{r.present}</td>
                <td className="p-3 text-right tabular-nums">{r.total}</td>
                <td className={`p-3 text-right font-bold ${r.pct >= 70 ? 'text-emerald-600' : r.pct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {r.pct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
