'use client';

import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINRShort } from '@/lib/utils';
import {
  Users, UserCheck, Building2, Activity as ActivityIcon, HeartHandshake,
  Clock, Banknote, TrendingUp, Map as MapIcon,
} from 'lucide-react';

const NAVY = '#1e3a8a';
const TEAL = '#0d9488';
const GOLD = '#f59e0b';
const RED = '#dc2626';
const SLATE = '#64748b';
const PURPLE = '#7c3aed';
const CYAN = '#0891b2';
const PALETTE = [TEAL, NAVY, GOLD, PURPLE, CYAN, RED, SLATE, '#db2777', '#16a34a', '#ca8a04'];

export type DistrictDashData = {
  districtName: string;
  districtCode: string;
  asOf: string;
  kpis: {
    totalMembers: number; active: number; lapsed: number; pending: number; suspended: number;
    totalClubs: number; totalZones: number; totalRegions: number;
    activitiesFY: number; peopleServed: number; serviceHours: number; fundsRaised: number;
    membersAddedFY: number; totalOfficers: number;
  };
  membershipByMonth: { month: string; total: number; added: number }[];
  membersByClub: { name: string; value: number }[];
  clubsByZone: { zone: string; clubs: number; members: number }[];
  activitiesByCategory: { category: string; count: number; beneficiaries: number }[];
  activitiesByMonth: { month: string; count: number }[];
  clubs: { id: string; name: string; club_number: string | null; zone: string; members: number; city: string | null }[];
  donationsByMonth: { month: string; amount: number }[];
  donationKpis: { totalFY: number; donorCountFY: number };
};

const TABS = ['Overview', 'Membership', 'Clubs', 'Service Activities', 'Donations'] as const;
type Tab = typeof TABS[number];

export function DistrictDashboard({ data }: { data: DistrictDashData }) {
  const [tab, setTab] = useState<Tab>('Overview');
  const k = data.kpis;
  const statusData = [
    { name: 'Active', value: k.active, color: TEAL },
    { name: 'Pending', value: k.pending, color: SLATE },
    { name: 'Lapsed', value: k.lapsed, color: GOLD },
    { name: 'Suspended', value: k.suspended, color: RED },
  ].filter((d) => d.value > 0);

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b mb-5">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${
              tab === t ? 'border-navy-700 text-navy-800' : 'border-transparent text-gray-500 hover:text-navy-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Summary rail */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-navy-800 mb-2">Summary</h2>
            <SummaryTile value={k.totalMembers.toLocaleString('en-IN')} label="Total Membership" icon={Users} from="from-sky-500" to="to-sky-600" />
            <SummaryTile value={k.active.toLocaleString('en-IN')} label="Active Members" icon={UserCheck} from="from-teal-500" to="to-teal-600" />
            <SummaryTile value={`${k.membersAddedFY.toLocaleString('en-IN')}`} label="Members Added in FY" icon={TrendingUp} from="from-indigo-500" to="to-indigo-600" />
            <SummaryTile value={String(k.totalClubs)} label="Total Clubs" icon={Building2} from="from-purple-500" to="to-purple-600" />
            <SummaryTile value={`${k.totalRegions} · ${k.totalZones}`} label="Regions · Zones" icon={MapIcon} from="from-cyan-500" to="to-cyan-600" />
            <SummaryTile value={k.activitiesFY.toLocaleString('en-IN')} label="Service Activities (FY)" icon={ActivityIcon} from="from-amber-500" to="to-amber-600" />
            <SummaryTile value={k.peopleServed.toLocaleString('en-IN')} label="People Served" icon={HeartHandshake} from="from-orange-500" to="to-orange-600" />
            <SummaryTile value={`₹${formatINRShort(k.fundsRaised)}`} label="Funds Raised (FY)" icon={Banknote} from="from-rose-500" to="to-rose-600" />
            <SummaryTile value={k.serviceHours.toLocaleString('en-IN')} label="Service Hours" icon={Clock} from="from-emerald-500" to="to-emerald-600" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Total Membership by Month">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.membershipByMonth} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" name="Total members" stroke={NAVY} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Members by Status">
              {statusData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Members by Club (top 10)">
              {data.membersByClub.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.membersByClub.slice(0, 10)} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="value" name="Members" fill={TEAL} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Service Activities by Category">
              {data.activitiesByCategory.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={data.activitiesByCategory} dataKey="count" nameKey="category" innerRadius={45} outerRadius={90} paddingAngle={2}>
                      {data.activitiesByCategory.map((d, i) => <Cell key={d.category} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {tab === 'Membership' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile label="Total Membership" value={k.totalMembers.toLocaleString('en-IN')} />
            <MetricTile label="Members Added (FY)" value={k.membersAddedFY.toLocaleString('en-IN')} tone="emerald" />
            <MetricTile label="Active" value={k.active.toLocaleString('en-IN')} tone="teal" />
            <MetricTile label="Lapsed + Suspended" value={(k.lapsed + k.suspended).toLocaleString('en-IN')} tone="rose" />
          </div>
          <ChartCard title="Total Membership by Month">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.membershipByMonth} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="g-mem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NAVY} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={NAVY} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" name="Total members" stroke={NAVY} fill="url(#g-mem)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="New Members Added by Month">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.membershipByMonth} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="added" name="Added" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {tab === 'Clubs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile label="Total Clubs" value={String(k.totalClubs)} />
            <MetricTile label="Zones" value={String(k.totalZones)} tone="cyan" />
            <MetricTile label="Regions" value={String(k.totalRegions)} tone="purple" />
            <MetricTile label="Officers" value={String(k.totalOfficers)} tone="amber" />
          </div>
          <ChartCard title="Clubs by Zone">
            {data.clubsByZone.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.clubsByZone} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="zone" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="clubs" name="Clubs" fill={NAVY} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="members" name="Members" fill={GOLD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <Card>
            <CardHeader><CardTitle>Clubs in {data.districtCode} ({data.clubs.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Club</th>
                      <th className="text-left p-3">LCI #</th>
                      <th className="text-left p-3">Zone</th>
                      <th className="text-left p-3">City</th>
                      <th className="text-right p-3">Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clubs.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3 text-gray-500">{c.club_number ?? '—'}</td>
                        <td className="p-3 text-gray-600">{c.zone}</td>
                        <td className="p-3 text-gray-600">{c.city ?? '—'}</td>
                        <td className="p-3 text-right">{c.members}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Service Activities' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile label="Activities (FY)" value={k.activitiesFY.toLocaleString('en-IN')} />
            <MetricTile label="People Served" value={k.peopleServed.toLocaleString('en-IN')} tone="orange" />
            <MetricTile label="Service Hours" value={k.serviceHours.toLocaleString('en-IN')} tone="emerald" />
            <MetricTile label="Funds Raised" value={`₹${formatINRShort(k.fundsRaised)}`} tone="rose" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Activities by Month">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.activitiesByMonth} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="g-act" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" name="Activities" stroke={GOLD} fill="url(#g-act)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Activities by Category">
              {data.activitiesByCategory.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.activitiesByCategory} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" name="Activities" fill={PURPLE} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {tab === 'Donations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricTile label="Total Donations (FY)" value={`₹${formatINRShort(data.donationKpis.totalFY)}`} tone="rose" />
            <MetricTile label="Donors (FY)" value={data.donationKpis.donorCountFY.toLocaleString('en-IN')} tone="teal" />
            <MetricTile label="Funds Raised via Activities (FY)" value={`₹${formatINRShort(k.fundsRaised)}`} tone="amber" />
          </div>
          <ChartCard title="Donations by Month">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.donationsByMonth} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)} />
                <Tooltip formatter={(v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)} />
                <Bar dataKey="amount" name="Donations" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <p className="text-xs text-gray-500">
            Donations are recorded at the chapter level (not attributed per club), so this reflects all recorded donations.
          </p>
        </div>
      )}

      <p className="text-right text-xs text-gray-400 mt-4">Data as of {data.asOf}</p>
    </div>
  );
}

function SummaryTile({ value, label, icon: Icon, from, to }: {
  value: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; from: string; to: string;
}) {
  return (
    <div className={`rounded-lg bg-gradient-to-r ${from} ${to} text-white px-4 py-3 flex items-center justify-between shadow-sm`}>
      <div>
        <div className="text-2xl font-extrabold leading-none">{value}</div>
        <div className="text-xs text-white/85 mt-1">{label}</div>
      </div>
      <Icon size={26} className="text-white/70" />
    </div>
  );
}

function MetricTile({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'teal' | 'rose' | 'cyan' | 'purple' | 'amber' | 'orange' }) {
  const color =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'teal' ? 'text-teal-700' : tone === 'rose' ? 'text-rose-700'
    : tone === 'cyan' ? 'text-cyan-700' : tone === 'purple' ? 'text-purple-700' : tone === 'amber' ? 'text-amber-700'
    : tone === 'orange' ? 'text-orange-700' : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">No data yet.</div>;
}
