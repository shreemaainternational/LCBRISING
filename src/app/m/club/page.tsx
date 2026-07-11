import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import {
  Users, CalendarPlus, QrCode, Activity, MapPin, CalendarDays,
} from 'lucide-react';
import { Card, CardHeading, LeadershipStrip, StatTile, RowCard, Avatar, roleLabel } from '../_ui';

export const dynamic = 'force-dynamic';

const CLUB_RANK: Record<string, number> = {
  club_president: 0, club_secretary: 1, club_treasurer: 2, club_officer: 3,
};

type OfficerRow = { role: string; member: { name: string; avatar_url: string | null } | null };

export default async function MyClub() {
  const member = await getCurrentMember();
  const db = createAdminClient();

  if (!member?.club_id) {
    return (
      <Card className="p-6 text-center">
        <Users size={32} className="text-[#1e40af] mx-auto" />
        <div className="mt-3 font-bold text-gray-900">No club assigned yet</div>
        <p className="text-sm text-gray-500 mt-1">
          You are not linked to a club. Ask your club secretary to add you, or browse the directory.
        </p>
        <Link href="/m/directory" className="inline-block mt-4 px-5 py-2.5 rounded-full bg-[#1e40af] text-white text-sm font-semibold">
          Open Directory
        </Link>
      </Card>
    );
  }

  const [
    { data: club },
    { count: memberCount },
    { data: officers },
    { data: members },
  ] = await Promise.all([
    db.from('clubs').select('name, city, state, charter_date').eq('id', member.club_id).maybeSingle(),
    db.from('members').select('*', { count: 'exact', head: true }).eq('club_id', member.club_id).is('deleted_at', null),
    db.from('officers').select('role, member:members(name, avatar_url)').eq('scope_kind', 'club').eq('scope_id', member.club_id).eq('status', 'active'),
    db.from('members').select('id, name, avatar_url, lions_role').eq('club_id', member.club_id).is('deleted_at', null).order('name').limit(20),
  ]);

  const leaders = ((officers ?? []) as unknown as OfficerRow[])
    .filter((o) => o.member)
    .sort((a, b) => (CLUB_RANK[a.role] ?? 9) - (CLUB_RANK[b.role] ?? 9))
    .map((o) => ({ name: o.member!.name, roleLabel: roleLabel(o.role), avatar: o.member!.avatar_url }));

  const charter = club?.charter_date
    ? new Date(club.charter_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  return (
    <>
      {/* Club identity */}
      <Card className="overflow-hidden">
        <div className="bg-[#1e40af] text-white p-4">
          <div className="text-xs uppercase tracking-widest text-blue-100/80">My Lions Club</div>
          <div className="text-2xl font-extrabold mt-0.5">{club?.name ?? 'My Club'}</div>
          <div className="text-sm text-blue-100/90 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {club?.city && <span className="inline-flex items-center gap-1"><MapPin size={12} />{club.city}{club.state ? `, ${club.state}` : ''}</span>}
            {charter && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />Chartered {charter}</span>}
          </div>
        </div>
      </Card>

      {/* Highlights */}
      <Card className="p-4">
        <CardHeading>Club Highlights</CardHeading>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <StatTile icon={Users} value={memberCount ?? 0} label="Members" />
          <StatTile icon={Users} value={leaders.length} label="Officers" />
        </div>
      </Card>

      {/* Officers */}
      <Card className="p-4">
        <CardHeading>Club Officers</CardHeading>
        <div className="mt-3"><LeadershipStrip people={leaders} /></div>
      </Card>

      {/* Members */}
      <Card className="p-4">
        <CardHeading>Members</CardHeading>
        <div className="mt-3 divide-y divide-gray-100">
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={m.name} src={m.avatar_url} size={38} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">{m.name}</div>
                <div className="text-xs text-gray-500">{roleLabel(m.lions_role)}</div>
              </div>
            </div>
          ))}
          {!members?.length && <p className="text-sm text-gray-400 py-3">No members listed yet.</p>}
        </div>
      </Card>

      {/* Quick links */}
      <RowCard icon={Activity} title="Club Activities" desc="View and report service activities" href="/m/activities" />
      <RowCard icon={CalendarPlus} title="Log an Activity" desc="Record a new service project" href="/m/activities/new" />
      <RowCard icon={QrCode} title="Event Check-in" desc="Scan QR codes at club events" href="/m/checkin" />
    </>
  );
}
