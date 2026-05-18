import Link from 'next/link';
import { requireMdChair, getMdKpis, getDistrictRollups } from '@/lib/multi-district-portal';
import { MdTabs } from './MdTabs';
import { formatINRShort } from '@/lib/utils';
import {
  MapPin, Building2, Users, CalendarDays, Activity as ActivityIcon,
  TrendingUp, Award, Bell, Download, Key, LogOut, AlertTriangle, ShieldCheck, Globe2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MultiDistrictDashboard() {
  const ctx = await requireMdChair();
  const kpis = await getMdKpis(ctx.md.id);
  const rollups = await getDistrictRollups(ctx.md.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight">
            Multiple District Council Dashboard
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 text-gray-600 text-sm">
            <Globe2 size={14} className="text-rose-500" />
            <span><strong>MD {ctx.md.code}</strong> · {ctx.md.name} · {ctx.md.country}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionBtn href="/multi-district/notifications" icon={Bell} label="Notifications" variant="outline" />
          <ActionBtn href="/api/multi-district/export" icon={Download} label="Export Report" variant="primary" />
          <ActionBtn href="/multi-district/profile" icon={Key} label="Change Password" variant="outline" />
          <ActionBtn href="/multi-district/logout" icon={LogOut} label="Logout" variant="danger" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Districts"    value={kpis.districts}    icon={MapPin}       color="rose" />
        <KpiTile label="Regions"      value={kpis.regions}      icon={ShieldCheck}  color="purple" />
        <KpiTile label="Zones"        value={kpis.zones}        icon={ShieldCheck}  color="blue" />
        <KpiTile label="Clubs"        value={kpis.clubs}        icon={Building2}    color="emerald" />
        <KpiTile label="Members"      value={kpis.members}      icon={Users}        color="orange" />
        <KpiTile label="Activities"   value={kpis.activities}   icon={CalendarDays} color="amber" />
        <KpiTile label="Vol. Hours"   value={kpis.volunteerHours} icon={ActivityIcon} color="purple" />
        <KpiTile label="Funds"        value={`₹${formatINRShort(kpis.fundsRaised)}`} icon={TrendingUp} color="emerald" />
        <KpiTile label="Beneficiaries" value={kpis.beneficiaries} icon={Award}      color="blue" />
        <KpiTile label="Critical clubs" value={kpis.criticalClubs}
          icon={AlertTriangle} color={kpis.criticalClubs ? 'rose' : 'emerald'} />
      </div>

      <MdTabs />

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="inline-flex items-center gap-2 font-semibold text-navy-800 mb-4">
          <Award size={16} className="text-amber-500" />
          District Performance Roll-up
        </h3>
        <div className="space-y-2">
          {rollups.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center">
              No districts under this MD yet. <Link href="/admin/districts" className="text-amber-600 underline">Create one</Link>.
            </div>
          ) : rollups.map((d, idx) => (
            <div key={d.id} className="flex items-center gap-4 py-3 px-3 rounded-lg border hover:bg-gray-50">
              <RankBadge rank={idx + 1} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-800">{d.name}</div>
                <div className="text-xs text-gray-500">
                  District {d.code}{d.governor_name && <> · DG {d.governor_name}</>}
                </div>
              </div>
              <Stat value={d.regions}    label="Regions" />
              <Stat value={d.zones}      label="Zones" />
              <Stat value={d.clubs}      label="Clubs" />
              <Stat value={d.members}    label="Members" />
              <Stat value={d.activities} label="Activities" />
              <Stat
                value={d.avgHealth == null ? '—' : `${d.avgHealth}`}
                label="Avg Health"
                color={d.avgHealth == null ? 'text-gray-400'
                  : d.avgHealth >= 70 ? 'text-emerald-600'
                  : d.avgHealth >= 50 ? 'text-amber-600' : 'text-rose-600'}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, icon: Icon, color }: {
  label: string; value: string | number;
  icon: React.ComponentType<{ size?: number }>;
  color: 'blue' | 'emerald' | 'purple' | 'orange' | 'amber' | 'rose';
}) {
  const palette: Record<typeof color, { bg: string; fg: string }> = {
    blue:    { bg: 'bg-blue-100',    fg: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-100', fg: 'text-emerald-700' },
    purple:  { bg: 'bg-purple-100',  fg: 'text-purple-700' },
    orange:  { bg: 'bg-orange-100',  fg: 'text-orange-700' },
    amber:   { bg: 'bg-amber-100',   fg: 'text-amber-700' },
    rose:    { bg: 'bg-rose-100',    fg: 'text-rose-700' },
  };
  const c = palette[color];
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-extrabold text-navy-900 mt-1">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-full ${c.bg} ${c.fg} flex items-center justify-center`}>
        <Icon size={18} />
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const bg = rank === 1 ? 'bg-amber-500' : rank === 2 ? 'bg-gray-400' : rank === 3 ? 'bg-amber-700' : 'bg-gray-300';
  return (
    <div className={`w-9 h-9 rounded-full ${bg} text-white font-bold flex items-center justify-center flex-shrink-0`}>
      {rank}
    </div>
  );
}

function Stat({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="hidden md:block text-center min-w-[60px]">
      <div className={`text-base font-bold ${color ?? 'text-navy-900'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}

function ActionBtn({ href, icon: Icon, label, variant }: {
  href: string; icon: React.ComponentType<{ size?: number }>; label: string;
  variant: 'primary' | 'outline' | 'danger';
}) {
  const cls = variant === 'primary'
    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
    : variant === 'danger'
      ? 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
      : 'bg-white text-gray-800 hover:bg-gray-50 border-gray-200';
  return (
    <Link href={href} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold ${cls}`}>
      <Icon size={14} /> {label}
    </Link>
  );
}
