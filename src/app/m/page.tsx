import { createAdminClient } from '@/lib/supabase/server';
import {
  ShieldCheck, Users, CalendarCheck, CalendarDays,
  HeartHandshake, Megaphone, GraduationCap, Sparkles,
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

  // Time-of-day greeting, computed in India Standard Time.
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()),
  );
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      {/* Slogan hero — premium royal blue + gold */}
      <section className="relative rounded-3xl overflow-hidden shadow-xl shadow-blue-900/20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2D6B] via-[#0B2D6B] to-[#1E3A8A]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(244,180,0,0.55), transparent 35%), radial-gradient(circle at 95% 85%, rgba(59,130,246,0.6), transparent 40%)' }}
        />
        <div className="relative p-6 text-center text-white">
          {/* Lions International emblem, top-left */}
          <span className="absolute top-4 left-4 h-12 w-12 rounded-full shadow-md overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-lions.png"
              alt="Lions Clubs International"
              className="h-12 w-12 object-contain"
            />
          </span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 mb-3">
            <Sparkles size={11} className="text-amber-300" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-200">{greeting}</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">Service First</h1>
          <p className="text-sm text-blue-100/90 mt-2">District 3232 F1 &nbsp;|&nbsp; Region V &nbsp;|&nbsp; Zone I</p>
          <p className="text-sm text-blue-100/90 mt-0.5">Year 2026-27</p>
        </div>
      </section>

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
