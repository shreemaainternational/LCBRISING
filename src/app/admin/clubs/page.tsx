import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminPage } from '@/lib/auth';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { clubsPreset } from '@/components/admin/quick-add-presets';
import { Users, MapPin, Calendar, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClubsPage() {
  await requireAdminPage();
  // Service-role read: the club member-count query reads members, whose
  // self-referential policy trips RLS recursion under the user session on
  // DBs missing migration 0059.
  const supa = createAdminClient();
  const [{ data: clubs }, { data: districts }, { data: members }] = await Promise.all([
    supa.from('clubs').select('id, name, district, city, state, charter_date, club_number, district_id')
      .is('deleted_at', null).order('name'),
    supa.from('districts').select('id, code, name').is('deleted_at', null).order('code'),
    supa.from('members').select('club_id').is('deleted_at', null),
  ]);

  const memberCount = new Map<string, number>();
  for (const m of members ?? []) {
    if (m.club_id) memberCount.set(m.club_id, (memberCount.get(m.club_id) ?? 0) + 1);
  }

  const preset = clubsPreset({ districts: districts ?? [] });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Clubs</h1>
          <p className="text-gray-600">All Lions clubs in the federation. Click a club to drill into officers and members.</p>
        </div>
        <QuickAddCard title="Club" {...preset} />
      </div>

      {!clubs?.length ? (
        <EmptyState
          icon={<Building2 size={26} />}
          title="No clubs yet"
          description="Charter your first club below or sync existing clubs from Lions International."
          cta={<QuickAddCard title="Club" {...preset} />}
          hint={<>Or go to <Link href="/admin/sync/lions" className="text-amber-600 underline">Sync → Lions</Link></>}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>{clubs.length} clubs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">District</th>
                  <th className="text-left p-3">City</th>
                  <th className="text-right p-3">Members</th>
                  <th className="text-left p-3">Chartered</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link href={`/admin/clubs/${c.id}`} className="text-navy-800 hover:underline">{c.name}</Link>
                      {c.club_number && <div className="text-xs text-gray-500">LCI #{c.club_number}</div>}
                    </td>
                    <td className="p-3 text-gray-600">{c.district ?? '—'}</td>
                    <td className="p-3 text-gray-600">
                      {c.city
                        ? <span className="inline-flex items-center gap-1"><MapPin size={11} />{c.city}{c.state ? `, ${c.state}` : ''}</span>
                        : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs"><Users size={11} />{memberCount.get(c.id) ?? 0}</span>
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {c.charter_date ? <span className="inline-flex items-center gap-1"><Calendar size={11} />{new Date(c.charter_date).toLocaleDateString('en-IN')}</span> : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/admin/clubs/${c.id}`} className="text-xs text-amber-600 hover:text-amber-800">View →</Link>
                    </td>
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
