import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { QuickAddCard } from '@/components/admin/QuickAddCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { ClubsTable } from '@/components/admin/ClubsTable';
import { clubsPreset } from '@/components/admin/quick-add-presets';
import { Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClubsPage() {
  // Read via the service-role client (this page is gated by the admin layout)
  // so member counts survive databases where the `members` RLS policy recurses.
  const supa = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const [{ data: clubs }, { data: districts }, { data: zones }, { data: regions }, { data: members }] = await Promise.all([
    supa.from('clubs').select('id, name, district, city, state, charter_date, club_number, district_id, zone_id, region_id')
      .is('deleted_at', null).order('name'),
    supa.from('districts').select('id, code, name').is('deleted_at', null).order('code'),
    supa.from('zones').select('id, code, name, district_id').is('deleted_at', null).order('code'),
    supa.from('regions').select('id, code, name, district_id').is('deleted_at', null).order('code'),
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
            <ClubsTable
              clubs={clubs}
              districts={districts ?? []}
              zones={zones ?? []}
              regions={regions ?? []}
              memberCounts={Object.fromEntries(memberCount)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
