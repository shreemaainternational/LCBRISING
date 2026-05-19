import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { formatINRShort } from '@/lib/utils';
import { lionsYearFor } from '@/lib/lions-calendar-meta';
import {
  Activity, Users, Banknote, HeartHandshake,
  Calendar, QrCode, Plus, ChevronRight, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Wifi,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MobileHome() {
  const member = await getCurrentMember();
  const db = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    { count: activitiesMo }, { count: activitiesPrev },
    { count: beneficiariesAll }, { count: beneficiariesPrev },
    { data: recentActivities }, { data: upcomingEvents },
    { data: dons }, { data: donsPrev },
  ] = await Promise.all([
    db.from('activities').select('*', { count: 'exact', head: true })
      .gte('date', monthStart.toISOString().slice(0, 10)),
    db.from('activities').select('*', { count: 'exact', head: true })
      .gte('date', prevMonthStart.toISOString().slice(0, 10))
      .lt('date', monthStart.toISOString().slice(0, 10)),
    db.from('beneficiaries').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('beneficiaries').select('*', { count: 'exact', head: true })
      .is('deleted_at', null).lt('created_at', monthStart.toISOString()),
    db.from('activities').select('id,title,date,beneficiaries,category')
      .order('date', { ascending: false }).limit(5),
    db.from('events').select('id,title,date,location')
      .gte('date', now.toISOString()).order('date').limit(3),
    db.from('donations').select('amount').gte('created_at', monthStart.toISOString()),
    db.from('donations').select('amount')
      .gte('created_at', prevMonthStart.toISOString())
      .lt('created_at', monthStart.toISOString()),
  ]);

  const fundsMonth = (dons ?? []).reduce((a, b) => a + Number(b.amount), 0);
  const fundsPrev = (donsPrev ?? []).reduce((a, b) => a + Number(b.amount), 0);
  const beneficiariesDelta = (beneficiariesAll ?? 0) - (beneficiariesPrev ?? 0);
  const firstName = member?.name?.split(' ')[0] ?? 'Lion';
  const roleLabel = roleDisplay(member?.lions_role ?? member?.role ?? null);
  const isSandbox = process.env.NEXT_PUBLIC_ENV !== 'production';

  return (
    <div className="space-y-4">
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-blue-900 text-white shadow-xl ring-1 ring-white/5">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative p-5">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-emerald-300/90 font-semibold uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {isSandbox ? 'Sandbox · Live' : 'Production · Live'}
            </div>
            <div className="flex items-center gap-1.5 text-white/60 font-medium">
              <Wifi size={11} /> Synced just now
            </div>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 ring-1 ring-amber-400/30 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            {greeting()}
          </div>

          <h1 className="mt-3 text-3xl font-bold leading-none tracking-tight">
            Service <span className="text-amber-400">First</span>
          </h1>
          <p className="mt-2 text-sm text-white/75">
            Welcome back, {firstName}. District 3232 FI · Lions Year {lionsYearFor(now)}
          </p>

          <div className="mt-4 flex items-center gap-2 text-[10px]">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 ring-1 ring-white/15 font-medium">
              <ShieldCheck size={11} className="text-amber-300" />
              {roleLabel}
            </span>
            {member?.lions_member_id && (
              <span className="rounded-md bg-white/5 px-2 py-1 ring-1 ring-white/10 font-mono text-[10px] tracking-wider text-white/70">
                ID · {member.lions_member_id}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ───────── KPIs ───────── */}
      <section className="grid grid-cols-2 gap-3">
        <MobKpi
          icon={Activity}
          label="This month"
          value={String(activitiesMo ?? 0)}
          hint="activities"
          delta={(activitiesMo ?? 0) - (activitiesPrev ?? 0)}
        />
        <MobKpi
          icon={Users}
          label="Beneficiaries"
          value={String(beneficiariesAll ?? 0)}
          hint="lifetime"
          delta={beneficiariesDelta}
          deltaLabel="new"
        />
        <MobKpi
          icon={Banknote}
          label="Donations"
          value={`₹${formatINRShort(fundsMonth)}`}
          hint="this month"
          delta={Math.round(fundsMonth - fundsPrev)}
          deltaFormat="currency"
        />
        <MobKpi
          icon={HeartHandshake}
          label="Events"
          value={String(upcomingEvents?.length ?? 0)}
          hint="upcoming"
        />
      </section>

      {/* ───────── Quick actions ───────── */}
      <section className="grid grid-cols-4 gap-2">
        <QuickAction href="/m/activities/new"     label="Log"      icon={Plus}     tone="amber" />
        <QuickAction href="/m/checkin"            label="QR Scan"  icon={QrCode}   tone="emerald" />
        <QuickAction href="/m/beneficiaries/new"  label="Add"      icon={Users}    tone="blue" />
        <QuickAction href="/invoices/lookup"      label="Pay"      icon={Banknote} tone="violet" />
      </section>

      {/* ───────── Recent activities ───────── */}
      <section>
        <SectionHeader title="Recent activity" count={recentActivities?.length} href="/m/activities" />
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm divide-y divide-gray-100">
          {(recentActivities ?? []).map((a) => (
            <Link
              key={a.id}
              href={`/m/activities/${a.id}`}
              className="flex items-center gap-3 px-3.5 py-3 active:bg-gray-50 transition"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${categoryDot(a.category)}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{a.title}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <span>{relativeTime(a.date)}</span>
                  {a.category && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="uppercase tracking-wide font-medium text-gray-500">{a.category}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-sm font-semibold text-navy-900">{a.beneficiaries ?? 0}</div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400">benef</div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </Link>
          ))}
          {!recentActivities?.length && (
            <div className="text-center text-sm text-gray-500 py-8">No activity logged yet.</div>
          )}
        </div>
      </section>

      {/* ───────── Upcoming ───────── */}
      {!!(upcomingEvents?.length) && (
        <section>
          <SectionHeader title="Upcoming events" count={upcomingEvents.length} href="/m/events" />
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm divide-y divide-gray-100">
            {upcomingEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-3.5 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                  <Calendar size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{e.title}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {new Date(e.date).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
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

// ────────────────────────── components ──────────────────────────

function MobKpi({
  icon: Icon, label, value, hint, delta, deltaLabel, deltaFormat,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string; value: string; hint: string;
  delta?: number; deltaLabel?: string; deltaFormat?: 'currency';
}) {
  const showDelta = typeof delta === 'number' && delta !== 0;
  const positive = (delta ?? 0) > 0;
  const formatted = deltaFormat === 'currency'
    ? `₹${formatINRShort(Math.abs(delta ?? 0))}`
    : Math.abs(delta ?? 0).toString();

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-700 ring-1 ring-slate-200/80">
          <Icon size={16} />
        </div>
        {showDelta && (
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
            positive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
          }`}>
            {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {formatted}{deltaLabel ? ` ${deltaLabel}` : ''}
          </span>
        )}
      </div>
      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-0.5 text-2xl font-bold text-navy-900 leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] text-gray-400">{hint}</div>
    </div>
  );
}

const TONES: Record<string, { icon: string; bg: string }> = {
  amber:   { icon: 'bg-amber-500 text-white',   bg: 'bg-amber-50 ring-amber-200/70' },
  emerald: { icon: 'bg-emerald-600 text-white', bg: 'bg-emerald-50 ring-emerald-200/70' },
  blue:    { icon: 'bg-blue-600 text-white',    bg: 'bg-blue-50 ring-blue-200/70' },
  violet:  { icon: 'bg-violet-600 text-white',  bg: 'bg-violet-50 ring-violet-200/70' },
};

function QuickAction({
  href, label, icon: Icon, tone,
}: {
  href: string; label: string; icon: React.ComponentType<{ size?: number }>; tone: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center rounded-2xl ${t.bg} ring-1 px-2 py-3 active:scale-[0.97] transition`}
    >
      <span className={`mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ${t.icon}`}>
        <Icon size={18} />
      </span>
      <span className="text-[11px] font-semibold text-navy-900">{label}</span>
    </Link>
  );
}

function SectionHeader({ title, count, href }: { title: string; count?: number; href?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-700">{title}</h2>
        {typeof count === 'number' && (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 tabular-nums">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700">
          View all <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ────────────────────────── helpers ──────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86_400_000;
  if (diff < 0) return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  if (diff < day) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function categoryDot(category: string | null): string {
  switch ((category ?? '').toLowerCase()) {
    case 'health':
    case 'medical': return 'bg-rose-500';
    case 'education': return 'bg-blue-500';
    case 'environment': return 'bg-emerald-500';
    case 'hunger': return 'bg-amber-500';
    case 'vision': return 'bg-violet-500';
    case 'community': return 'bg-sky-500';
    default: return 'bg-slate-400';
  }
}

function roleDisplay(role: string | null): string {
  if (!role) return 'Member';
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
