'use client';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { MonthlySeries, ClubAnalytics } from '@/lib/zone-analytics';

const NAVY = '#1e3a8a';
const GOLD = '#f59e0b';
const TEAL = '#0d9488';
const ROSE = '#e11d48';

interface Props { series: MonthlySeries[]; clubs: ClubAnalytics[] }

export function ZoneAnalyticsCharts({ series, clubs }: Props) {
  const top = clubs.slice(0, 8).map((c) => ({
    name: shortName(c.name),
    members: c.members,
    activities: c.activities30d,
    beneficiaries: c.beneficiaries,
    attendance: c.attendancePct,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="Membership growth (12m)">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="members" stroke={NAVY} strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Activities per month (12m)">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="activities" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Funds raised per month (₹)">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
            <Line type="monotone" dataKey="fundsRaised" stroke={TEAL} strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top clubs · activities (30d) vs attendance">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={top}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left"  dataKey="activities" fill={GOLD}  name="Activities · 30d" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="attendance" fill={ROSE}  name="Attendance %"     radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h4 className="font-semibold text-navy-800 text-sm mb-2">{title}</h4>
      {children}
    </div>
  );
}

function shortName(name: string): string {
  return name
    .replace(/^Lions Clubs? of\s+/i, '')
    .replace(/Baroda\s+/i, '')
    .slice(0, 16);
}
