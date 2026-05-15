import Link from 'next/link';
import { requireRegionChair, getRegionKpis, getZoneScores } from '@/lib/region-portal';
import { RegionTabs } from './RegionTabs';
import { formatINRShort } from '@/lib/utils';
import {
  MapPin, Building2, Users, CalendarDays, Activity as ActivityIcon,
  TrendingUp, Award, Bell, Download, Key, LogOut,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RegionDashboard() {
  const ctx = await requireRegionChair();
  const kpis = await getRegionKpis(ctx.region.id);
  const scores = await getZoneScores(ctx.region.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight">
            Region Chairperson Dashboard
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 text-gray-600 text-sm">
            <MapPin size={14} className="text-purple-500" />
            <span>
              <strong>{ctx.region.name}</strong>
              {ctx.district && <> · District {ctx.district.code}</>}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionBtn href="/region/notifications" icon={Bell} label="Notifications" variant="outline" />
          <ActionBtn href="/api/region/export" icon={Download} label="Export Report" variant="primary" />
          <ActionBtn href="/region/profile" icon={Key} label="Change Password" variant="outline" />
          <ActionBtn href="/region/logout" icon={LogOut} label="Logout" variant="danger" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiTile label="Zones"        value={kpis.zones}        icon={MapPin}       color="purple" />
        <KpiTile label="Clubs"        value={kpis.clubs}        icon={Building2}    color="blue" />
        <KpiTile label="Members"      value={kpis.members}      icon={Users}        color="emerald" />
        <KpiTile label="Activities"   value={kpis.activities}   icon={CalendarDays} color="orange" />
        <KpiTile label="Vol. Hours"   value={kpis.volunteerHours} icon={ActivityIcon} color="rose" />
        <KpiTile label="Funds"        value={`₹${formatINRShort(kpis.fundsRaised)}`} icon={TrendingUp} color="amber" />
        <KpiTile label="Beneficiaries" value={kpis.beneficiaries} icon={Award}      color="emerald" />
      </div>

      <RegionTabs />

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="inline-flex items-center gap-2 font-semibold text-navy-800 mb-4">
          <Award size={16} className="text-amber-500" />
          Zone Performance Rankings
        </h3>
        <div className="space-y-2">
          {scores.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center">No zones in this region yet.</div>
          ) : scores.map((z, idx) => (
            <div key={z.id} className="flex items-center gap-4 py-3 px-3 rounded-lg border hover:bg-gray-50">
              <RankBadge rank={idx + 1} />
              <div className="flex-1 min-w-0">
                <Link href={`/admin/zones/${z.id}`} className="font-semibold text-navy-800 hover:underline">{z.name}</Link>
                <div className="text-xs text-gray-500">Zone {z.code}</div>
              </div>
              <Stat value={z.clubs}          label="Clubs" />
              <Stat value={z.members}        label="Members" />
              <Stat value={z.activities}     label="Activities" />
              <Stat value={`${z.attendancePct}%`} label="Attendance" />
              <Stat
                value={z.score}
                label="Score"
                color={z.score >= 70 ? 'text-emerald-600' : z.score >= 50 ? 'text-amber-600' : 'text-rose-600'}
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
      <Icon size={14} />
      {label}
    </Link>
  );
}
