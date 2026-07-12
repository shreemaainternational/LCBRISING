import { createAdminClient } from '@/lib/supabase/server';
import {
  ShieldCheck, Users, CalendarCheck, CalendarDays,
  HeartHandshake, Megaphone, GraduationCap,
} from 'lucide-react';
import {
  Card, CardHeading, LeadershipStrip, StatTile, RowCard, IconAction, roleLabel,
} from './_ui';

export const dynamic = 'force-dynamic';

const DISTRICT_RANK: Record<string, number> = {
  district_governor: 0,
  vice_district_governor: 1,
  cabinet_officer: 2,
  region_chairperson: 3,
  zone_chairperson: 4,
};

type OfficerRow = { role: string; notes: string | null; source_id: string | null; member: { name: string; avatar_url: string | null } | null };

export default async function MobileHome() {
  const db = createAdminClient();

  const [
    { count: totalClubs },
    { count: totalMembers },
    { count: totalActivities },
    { data: officers },
    { data: district },
  ] = await Promise.all([
    db.from('clubs').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('activities').select('*', { count: 'exact', head: true }),
    db.from('officers')
      .select('role, notes, source_id, member:members(name, avatar_url)')
      .eq('scope_kind', 'district')
      .eq('status', 'active'),
    db.from('districts').select('governor_name, cabinet_secretary_name, cabinet_treasurer_name, updated_at').limit(1).maybeSingle(),
  ]);

  // Build the leadership strip from officers; fall back to the names
  // stored on the district row when no officer records exist yet.
  let leaders = ((officers ?? []) as unknown as OfficerRow[])
    .filter((o) => o.member)
    .sort((a, b) =>
      (a.source_id ?? 'zzz').localeCompare(b.source_id ?? 'zzz') ||
      (DISTRICT_RANK[a.role] ?? 9) - (DISTRICT_RANK[b.role] ?? 9),
    )
    .map((o) => ({ name: o.member!.name, roleLabel: o.notes ?? roleLabel(o.role), avatar: o.member!.avatar_url }));

  if (!leaders.length && district) {
    leaders = [
      district.governor_name && { name: district.governor_name, roleLabel: 'District Governor', avatar: null },
      district.cabinet_secretary_name && { name: district.cabinet_secretary_name, roleLabel: 'Cabinet Secretary', avatar: null },
      district.cabinet_treasurer_name && { name: district.cabinet_treasurer_name, roleLabel: 'Cabinet Treasurer', avatar: null },
    ].filter(Boolean) as { name: string; roleLabel: string; avatar: null }[];
  }

  const lastUpdated = district?.updated_at
    ? new Date(district.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <>
      {/* Current Leadership */}
      <Card className="p-4">
        <CardHeading>Current Leadership</CardHeading>
        <div className="mt-3">
          <LeadershipStrip people={leaders} />
        </div>
      </Card>

      {/* District Highlights */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-[#1e40af]" />
        <div className="p-4">
          <CardHeading>District Highlights</CardHeading>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <StatTile icon={ShieldCheck} value={totalClubs ?? 0} label="Lions Clubs" />
            <StatTile icon={Users} value={totalMembers ?? 0} label="Lions Members" />
            <StatTile icon={CalendarCheck} value={totalActivities ?? 0} label="Activities" />
          </div>
        </div>
        <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
          Last Updated: {lastUpdated}
        </div>
      </Card>

      {/* District Calendar */}
      <RowCard
        icon={CalendarDays}
        title="District Calendar"
        desc="Stay updated with upcoming district programs and events"
        href="/m/events"
      />

      {/* What We Do? */}
      <Card className="p-4">
        <CardHeading>What We Do?</CardHeading>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <IconAction icon={HeartHandshake} label="Service Activities" href="/m/activities" />
          <IconAction icon={CalendarDays} label="Programs" href="/m/events" />
          <IconAction icon={Megaphone} label="Member Stories" href="/blog" />
        </div>
      </Card>

      {/* District Learning Center */}
      <RowCard
        icon={GraduationCap}
        title="District Learning Center"
        desc="Learn, grow and earn certificates through curated courses"
        href="/m/learning"
      />
    </>
  );
}
