'use client';

import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

type DailyPoint = { date: string; collected: number; count: number };

export function CollectionsChart({ data }: { data: DailyPoint[] }) {
  const chartData = data.map((d) => ({
    label: d.date.slice(5),
    collected: d.collected,
    count: d.count,
  }));
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="lcbCollections" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" fontSize={10} tickMargin={6} />
          <YAxis fontSize={10} tickMargin={4} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
          <Tooltip
            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Collected']}
            labelFormatter={(l) => `Day ${l}`}
          />
          <Area type="monotone" dataKey="collected" stroke="#7c3aed" fill="url(#lcbCollections)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
