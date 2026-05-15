import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { Users, MapPin, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClubsPage() {
  const supa = await createClient();
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

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1">Clubs</h1>
          <p className="text-gray-600">All Lions clubs in the federation. Click a club to drill into officers and members.</p>
        </div>
        <QuickAddCard
          title="Club"
          endpoint="/api/crm/clubs"
          accent="blue"
          description="Charter a new club. Use the Lions sync to onboard existing clubs from MyLCI instead."
          responseKey="club"
          fields={[
            { name: 'name', label: 'Club Name', type: 'text', required: true, placeholder: 'Lions Club of …' },
            { name: 'district_id', label: 'District', type: 'select',
              options: (districts ?? []).map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` })) },
            { name: 'club_number', label: 'LCI Club Number', type: 'text' },
            { name: 'city', label: 'City', type: 'text' },
            { name: 'state', label: 'State', type: 'text', defaultValue: 'Gujarat' },
            { name: 'country', label: 'Country', type: 'text', defaultValue: 'India' },
            { name: 'charter_date', label: 'Charter Date', type: 'date' },
          ]}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>{clubs?.length ?? 0} clubs</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!clubs?.length ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No clubs yet. Add one above or sync from Lions International.
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
