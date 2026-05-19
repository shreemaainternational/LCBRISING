import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { formatINRShort } from '@/lib/utils';
import { lionsYearFor } from '@/lib/lions-calendar-meta';
import {
  Activity, Users, Banknote, HeartHandshake,
  Calendar, QrCode, Plus, ChevronRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MobileHome() {
  const member = await getCurrentMember();
  const db = createAdminClient();

  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [
    { count: activitiesMo }, { count: beneficiariesAll },
    { data: recentActivities }, { data: upcomingEvents },
    { data: dons },
  ] = await Promise.all([
    db.from('activities').select('*', { count: 'exact', head: true })
      .gte('date', monthStart.toISOString().slice(0, 10)),
    db.from('beneficiaries').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('activities').select('id,title,date,beneficiaries,category')
      .order('date', { ascending: false }).limit(4),
    db.from('events').select('id,title,date,location')
      .gte('date', new Date().toISOString()).order('date').limit(3),
    db.from('donations').select('amount')
      .gte('created_at', monthStart.toISOString()),
  ]);

  const fundsMonth = (dons ?? []).reduce((a, b) => a + Number(b.amount), 0);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-navy-900 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
          <span>✨</span>{greeting()}
        </div>
        <h1 className="text-2xl font-bold mt-3 leading-tight">
          Service <span className="text-amber-400">First</span>
        </h1>
        <div className="text-sm opacity-80 mt-2">
          Welcome back, {member?.name?.split(' ')[0] ?? 'Lion'}. District 3232 FI · Lions Year {lionsYearFor(new Date())}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MobKpi icon={Activity} label="This month" value={String(activitiesMo ?? 0)} hint="activities" color="bg-blue-100 text-blue-700" />
        <MobKpi icon={Users} label="Beneficiaries" value={String(beneficiariesAll ?? 0)} hint="lifetime" color="bg-emerald-100 text-emerald-700" />
        <MobKpi icon={Banknote} label="Donations" value={`₹${formatINRShort(fundsMonth)}`} hint="this month" color="bg-amber-100 text-amber-700" />
        <MobKpi icon={HeartHandshake} label="Events" value={String(upcomingEvents?.length ?? 0)} hint="upcoming" color="bg-purple-100 text-purple-700" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <QuickAction href="/m/activities/new" label="Log Activity" icon={Plus} color="bg-amber-500" />
        <QuickAction href="/m/checkin" label="QR Scan" icon={QrCode} color="bg-emerald-500" />
        <QuickAction href="/m/beneficiaries/new" label="Add Person" icon={Users} color="bg-blue-500" />
        <QuickAction href="/invoices/lookup" label="Pay / UPI" icon={Banknote} color="bg-purple-500" />
      </div>

      <section>
        <SectionHeader title="Recent Activities" href="/m/activities" />
        <div className="space-y-2">
          {(recentActivities ?? []).map((a) => (
            <Link key={a.id} href={`/m/activities/${a.id}`}
              className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm active:scale-[0.99] transition">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{a.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  {a.category && ` · ${a.category}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-navy-800">{a.beneficiaries ?? 0}</div>
                <div className="text-[10px] text-gray-500">benef.</div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </Link>
          ))}
          {!recentActivities?.length && (
            <div className="text-center text-sm text-gray-500 py-6 bg-white rounded-xl">
              No activities yet
            </div>
          )}
        </div>
      </section>

      {!!(upcomingEvents?.length) && (
        <section>
          <SectionHeader title="Upcoming Events" href="/m/events" />
          <div className="space-y-2">
            {upcomingEvents!.map((e) => (
              <div key={e.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{e.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(e.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {e.location && ` · ${e.location}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MobKpi({ icon: Icon, label, value, hint, color }: {
  icon: React.ComponentType<{ size?: number }>; label: string; value: string; hint: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-xl font-bold text-navy-800 leading-tight">{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{hint}</div>
    </div>
  );
}

function QuickAction({ href, label, icon: Icon, color }: {
  href: string; label: string; icon: React.ComponentType<{ size?: number }>; color: string;
}) {
  return (
    <Link href={href}
      className={`flex flex-col items-center justify-center py-4 rounded-xl text-white shadow-sm active:scale-95 transition ${color}`}>
      <Icon size={22} />
      <span className="text-[11px] font-semibold mt-1.5 text-center px-1">{label}</span>
    </Link>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {href && (
        <Link href={href} className="text-xs text-amber-600 font-medium">View all →</Link>
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
