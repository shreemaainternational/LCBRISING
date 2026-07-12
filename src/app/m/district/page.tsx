import { createAdminClient } from '@/lib/supabase/server';
import {
  ShieldCheck, Users, CalendarCheck, CalendarDays, BookUser, FileBarChart, MapPin,
} from 'lucide-react';
import { Card, CardHeading, LeadershipStrip, StatTile, RowCard, Avatar, roleLabel } from '../_ui';

export const dynamic = 'force-dynamic';

const DISTRICT_RANK: Record<string, number> = {
  district_governor: 0, vice_district_governor: 1, cabinet_officer: 2,
  region_chairperson: 3, zone_chairperson: 4,
};

type OfficerRow = { role: string; notes: string | null; source_id: string | null; member: { name: string; avatar_url: string | null } | null };

export default async function MyDistrict() {
  const db = createAdminClient();

  const [
    { data: district },
    { count: totalClubs },
    { count: totalMembers },
    { count: totalActivities },
    { data: officers },
    { data: clubs },
  ] = await Promise.all([
    db.from('districts').select('code, name, lions_year, governor_name').limit(1).maybeSingle(),
    db.from('clubs').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('activities').select('*', { count: 'exact', head: true }),
    db.from('officers').select('role, notes, source_id, member:members(name, avatar_url)').eq('scope_kind', 'district').eq('status', 'active'),
    db.from('clubs').select('id, name, city').is('deleted_at', null).order('name').limit(12),
  ]);

  const leaders = ((officers ?? []) as unknown as OfficerRow[])
    .filter((o) => o.member)
    .sort((a, b) =>
      (a.source_id ?? 'zzz').localeCompare(b.source_id ?? 'zzz') ||
      (DISTRICT_RANK[a.role] ?? 9) - (DISTRICT_RANK[b.role] ?? 9),
    )
    .map((o) => ({ name: o.member!.name, roleLabel: o.notes ?? roleLabel(o.role), avatar: o.member!.avatar_url }));

  return (
    <>
      {/* District identity */}
      <Card className="overflow-hidden">
        <div className="bg-[#1e40af] text-white p-4">
          <div className="text-xs uppercase tracking-widest text-blue-100/80">Lions District</div>
          <div className="text-2xl font-extrabold mt-0.5">{district?.name ?? 'District 3232 F1'}</div>
          <div className="text-sm text-blue-100/90 mt-1">
            {district?.code ?? '3232 F1'}{district?.lions_year ? ` · Lions Year ${district.lions_year}` : ''}
          </div>
        </div>
      </Card>

      {/* Leadership */}
      <Card className="p-4">
        <CardHeading>Current Leadership</CardHeading>
        <div className="mt-3"><LeadershipStrip people={leaders} /></div>
      </Card>

      {/* Highlights */}
      <Card className="p-4">
        <CardHeading>District Highlights</CardHeading>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <StatTile icon={ShieldCheck} value={totalClubs ?? 0} label="Lions Clubs" />
          <StatTile icon={Users} value={totalMembers ?? 0} label="Lions Members" />
          <StatTile icon={CalendarCheck} value={totalActivities ?? 0} label="Activities" />
        </div>
      </Card>

      {/* Clubs in the district */}
      <Card className="p-4">
        <CardHeading>Clubs in District</CardHeading>
        <div className="mt-3 divide-y divide-gray-100">
          {(clubs ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={c.name} size={38} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">{c.name}</div>
                {c.city && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={11} /> {c.city}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!clubs?.length && <p className="text-sm text-gray-400 py-3">No clubs added yet.</p>}
        </div>
      </Card>

      {/* Quick links */}
      <RowCard icon={CalendarDays} title="District Calendar" desc="Upcoming district programs and events" href="/m/events" />
      <RowCard icon={BookUser} title="Member Directory" desc="Find members and officers across the district" href="/m/directory" />
      <RowCard icon={FileBarChart} title="District Reports" desc="Service, membership and activity reports" href="/m/reports" />
    </>
  );
}
