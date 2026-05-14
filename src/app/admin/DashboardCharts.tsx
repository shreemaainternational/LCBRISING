'use client';

import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const NAVY = '#1e3a8a';
const GOLD = '#f59e0b';
const TEAL = '#0d9488';
const RED = '#dc2626';
const SLATE = '#64748b';

export function DonationTrendChart({
  data,
}: { data: { month: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="g-donations" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)} />
        <Tooltip
          formatter={(v: number) =>
            new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
          }
        />
        <Area type="monotone" dataKey="amount" stroke={GOLD} fill="url(#g-donations)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MembershipPieChart({
  active, lapsed, pending,
}: { active: number; lapsed: number; pending: number }) {
  const data = [
    { name: 'Active', value: active, color: TEAL },
    { name: 'Lapsed', value: lapsed, color: RED },
    { name: 'Pending', value: pending, color: SLATE },
  ].filter((d) => d.value > 0);
  if (data.length === 0) {
    return <p className="text-center text-sm text-gray-500 py-8">No members yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ActivitiesByCategoryChart({
  data,
}: { data: { category: string; count: number; beneficiaries: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} height={60} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" name="Projects" fill={NAVY} radius={[4, 4, 0, 0]} />
        <Bar dataKey="beneficiaries" name="Beneficiaries" fill={GOLD} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
