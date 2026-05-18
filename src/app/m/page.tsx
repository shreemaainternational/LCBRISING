import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { formatINRShort } from '@/lib/utils';
import {
  Activity, Users, Banknote, HeartHandshake,
  Calendar, QrCode, Plus, ChevronRight, Sparkles,
  BookUser, Gift, Network, Award, BellRing, Cake, Droplet,
  GraduationCap, ArrowUpRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MobileHome() {
  const member = await getCurrentMember();
  const db = createAdminClient();

  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [
    { count: totalMembers }, { count: totalClubs },
    { count: activitiesMo }, { count: beneficiariesAll },
    { data: recentActivities }, { data: upcomingEvents },
    { data: dons }, { data: birthdayMembers },
  ] = await Promise.all([
    db.from('members').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('clubs').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('activities').select('*', { count: 'exact', head: true })
      .gte('date', monthStart.toISOString().slice(0, 10)),
    db.from('beneficiaries').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('activities').select('id,title,date,beneficiaries,category')
      .order('date', { ascending: false }).limit(4),
    db.from('events').select('id,title,date,location')
      .gte('date', new Date().toISOString()).order('date').limit(3),
    db.from('donations').select('amount')
      .gte('created_at', monthStart.toISOString()),
    db.from('members').select('id, name, birthday').is('deleted_at', null).not('birthday', 'is', null).limit(50),
  ]);

  const fundsMonth = (dons ?? []).reduce((a, b) => a + Number(b.amount), 0);

  const today = new Date();
  const todayKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const birthdaysToday = ((birthdayMembers ?? []) as { birthday: string }[])
    .filter((m) => m.birthday && m.birthday.slice(5, 10) === todayKey).length;

  return (
    <div className="space-y-5">
      {/* Hero — premium royal blue + gold */}
      <section className="relative rounded-3xl overflow-hidden shadow-xl shadow-blue-900/20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2D6B] via-[#0B2D6B] to-[#1E3A8A]" />
        <div aria-hidden className="absolute inset-0 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 15%, rgba(244,180,0,0.55), transparent 35%), radial-gradient(circle at 95% 85%, rgba(59,130,246,0.6), transparent 40%)' }} />
        <div className="relative p-5 text-white">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 mb-3">
            <Sparkles size={11} className="text-amber-300" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-200">{greeting()}</span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight">
            Shine for a<br />
            <span className="text-amber-300">Better Tomorrow</span>
          </h1>
          <p className="text-xs text-blue-100/85 mt-2">
            Welcome back, {member?.name?.split(' ')[0] ?? 'Lion'}. District 3232 F1 · Lions Year 2025-26.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-4 -mx-1">
            <HeroStat label="Members" value={String(totalMembers ?? 0)} />
            <HeroStat label="Clubs" value={String(totalClubs ?? 0)} />
            <HeroStat label="This month" value={String(activitiesMo ?? 0)} suffix="acts" />
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <MobKpi icon={Activity} label="Activities" value={String(activitiesMo ?? 0)} hint="this month" tone="blue" />
        <MobKpi icon={Users} label="Beneficiaries" value={String(beneficiariesAll ?? 0)} hint="lifetime" tone="emerald" />
        <MobKpi icon={Banknote} label="Donations" value={`₹${formatINRShort(fundsMonth)}`} hint="this month" tone="amber" />
        <MobKpi icon={HeartHandshake} label="Events" value={String(upcomingEvents?.length ?? 0)} hint="upcoming" tone="purple" />
      </div>

      {/* Quick actions */}
      <section>
        <SectionHeader title="Quick actions" />
        <div className="grid grid-cols-4 gap-2">
          <QuickAction href="/m/activities/new" label="Report" icon={Plus} color="from-amber-400 to-amber-600" />
          <QuickAction href="/m/checkin" label="QR Scan" icon={QrCode} color="from-emerald-400 to-emerald-600" />
          <QuickAction href="/m/directory" label="Directory" icon={BookUser} color="from-blue-400 to-blue-600" />
          <QuickAction href="/m/networking" label="Network" icon={Network} color="from-purple-400 to-purple-600" />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          <QuickAction href="/m/greetings" label="Greetings" icon={Gift} color="from-rose-400 to-rose-600" />
          <QuickAction href="/invoices/lookup" label="Pay Dues" icon={Banknote} color="from-cyan-400 to-cyan-600" />
          <QuickAction href="/m/blood" label="Blood" icon={Droplet} color="from-red-500 to-red-700" />
          <QuickAction href="/m/learning" label="Learning" icon={GraduationCap} color="from-indigo-400 to-indigo-600" />
        </div>
      </section>

      {/* Recent activities */}
      <section>
        <SectionHeader title="Recent Activities" href="/m/activities" />
        <div className="space-y-2">
          {(recentActivities ?? []).map((a) => (
            <Link key={a.id} href={`/m/activities/${a.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm active:scale-[0.99] transition border border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-navy-900 truncate">{a.title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  {a.category && <> · {a.category}</>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-navy-900">{a.beneficiaries ?? 0}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">benef</div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </Link>
          ))}
          {!recentActivities?.length && (
            <div className="text-center text-sm text-gray-500 py-6 bg-white rounded-2xl border border-gray-100">
              No activities yet
            </div>
          )}
        </div>
      </section>

      {/* Upcoming events */}
      {!!(upcomingEvents?.length) && (
        <section>
          <SectionHeader title="Upcoming Events" href="/m/events" />
          <div className="space-y-2">
            {upcomingEvents!.map((e) => (
              <div key={e.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3 border border-gray-100">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-navy-900 truncate">{e.title}</div>
                  <div className="text-[11px] text-gray-500">
                    {new Date(e.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {e.location && <> · {e.location}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Live widgets */}
      <section>
        <SectionHeader title="Today" />
        <div className="grid grid-cols-2 gap-3">
          <Link href="/m/greetings" className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-3 text-white shadow-md active:scale-95 transition">
            <Cake size={18} className="mb-2" />
            <div className="text-xs font-bold opacity-90">Birthdays today</div>
            <div className="text-xl font-extrabold mt-0.5">
              {birthdaysToday > 0 ? `🎂 ${birthdaysToday}` : '—'}
            </div>
            <div className="text-[10px] opacity-80 mt-1">Tap to send wishes</div>
          </Link>
          <Link href="/m/networking" className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-3 text-white shadow-md active:scale-95 transition">
            <Award size={18} className="mb-2" />
            <div className="text-xs font-bold opacity-90">Networking</div>
            <div className="text-xl font-extrabold mt-0.5 inline-flex items-center gap-1">
              View <ArrowUpRight size={14} />
            </div>
            <div className="text-[10px] opacity-80 mt-1">Refer & earn points</div>
          </Link>
          <Link href="/m/directory" className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-3 text-white shadow-md active:scale-95 transition">
            <BellRing size={18} className="mb-2" />
            <div className="text-xs font-bold opacity-90">Cabinet</div>
            <div className="text-xl font-extrabold mt-0.5">Open →</div>
            <div className="text-[10px] opacity-80 mt-1">DG team, committees</div>
          </Link>
          <Link href="/m/learning" className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-3 text-white shadow-md active:scale-95 transition">
            <GraduationCap size={18} className="mb-2" />
            <div className="text-xs font-bold opacity-90">Lions Learning</div>
            <div className="text-xl font-extrabold mt-0.5">→</div>
            <div className="text-[10px] opacity-80 mt-1">Resume training</div>
          </Link>
        </div>
      </section>

      <div className="text-center text-[10px] text-gray-400 pt-4">
        🦁 District 3232 F1 · Lions Clubs International
      </div>
    </div>
  );
}

function HeroStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-white/10 backdrop-blur border border-white/15 rounded-xl px-2 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-blue-100/80 font-semibold">{label}</div>
      <div className="text-lg font-extrabold text-white leading-tight">
        {value}{suffix && <span className="text-[10px] font-medium text-blue-200 ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

function MobKpi({ icon: Icon, label, value, hint, tone }: {
  icon: React.ComponentType<{ size?: number }>; label: string; value: string; hint: string;
  tone: 'blue' | 'emerald' | 'amber' | 'purple';
}) {
  const palette = {
    blue:    'from-blue-100 to-blue-50 text-blue-700',
    emerald: 'from-emerald-100 to-emerald-50 text-emerald-700',
    amber:   'from-amber-100 to-amber-50 text-amber-700',
    purple:  'from-purple-100 to-purple-50 text-purple-700',
  }[tone];
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${palette} flex items-center justify-center mb-2`}>
        <Icon size={18} />
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-xl font-extrabold text-navy-900 leading-tight">{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{hint}</div>
    </div>
  );
}

function QuickAction({ href, label, icon: Icon, color }: {
  href: string; label: string; icon: React.ComponentType<{ size?: number }>; color: string;
}) {
  return (
    <Link href={href}
      className={`flex flex-col items-center justify-center py-3.5 rounded-2xl text-white shadow-md shadow-blue-900/10 active:scale-95 transition bg-gradient-to-br ${color}`}>
      <Icon size={20} />
      <span className="text-[10px] font-bold mt-1.5 text-center px-1">{label}</span>
    </Link>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">{title}</h2>
      {href && (
        <Link href={href} className="text-[11px] text-amber-600 font-bold inline-flex items-center gap-0.5">
          View all <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
