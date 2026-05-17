import { requireZoneChair } from '@/lib/zone-portal';
import { getZoneAnalytics } from '@/lib/zone-analytics';
import { ZoneTabs } from '../ZoneTabs';
import { ZoneAnalyticsCharts } from './ZoneAnalyticsCharts';
import { formatINRShort } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ZoneAnalyticsPage() {
  const ctx = await requireZoneChair();
  const a = await getZoneAnalytics(ctx.zone.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight inline-flex items-center gap-2">
          <Sparkles className="text-amber-500" size={28} /> Zone Analytics
        </h2>
        <p className="text-gray-600 text-sm mt-1 max-w-3xl">
          Power-BI-style comparison across every club in Zone {ctx.zone.code}.
          Ranking is a composite score (40% recent activities, 25% attendance,
          20% size, 15% health). Forecasts are linear projections over 12 months
          of CRM data — directional, not gospel.
        </p>
      </div>
      <ZoneTabs />

      {a.clubs.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
          No clubs in this zone yet. Add one on the Clubs tab.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiTile label="Members"        value={String(a.totals.members)} />
            <KpiTile label="Activities · 12m" value={String(a.totals.activities)} />
            <KpiTile label="Beneficiaries"  value={String(a.totals.beneficiaries)} color="text-emerald-700" />
            <KpiTile label="Funds raised"   value={`₹${formatINRShort(a.totals.fundsRaised)}`} />
            <KpiTile label="Service hours"  value={String(Math.round(a.totals.serviceHours))} />
            <KpiTile label="Dues pending"   value={`₹${formatINRShort(a.totals.duesPending)}`}
              color={a.totals.duesPending > 0 ? 'text-rose-700' : 'text-gray-500'} />
          </div>

          <section className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold text-navy-800 mb-3 inline-flex items-center gap-2">
              <Sparkles size={14} className="text-purple-500" /> AI 3-month forecast
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {a.predictions.map((p) => {
                const Icon = p.trend === 'up' ? TrendingUp : p.trend === 'down' ? TrendingDown : Minus;
                const color = p.trend === 'up' ? 'text-emerald-700'
                  : p.trend === 'down' ? 'text-rose-700' : 'text-gray-600';
                return (
                  <div key={p.metric} className="border rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{p.metric}</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-extrabold text-navy-900">
                        {p.metric.includes('₹') ? `₹${formatINRShort(p.forecast3m)}` : p.forecast3m.toLocaleString('en-IN')}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${color}`}>
                        <Icon size={12} /> {p.changePct >= 0 ? '+' : ''}{p.changePct}%
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      from {p.metric.includes('₹') ? `₹${formatINRShort(p.current)}` : p.current.toLocaleString('en-IN')} today
                    </div>
                    <p className="text-[11px] text-gray-600 italic mt-1">{p.reason}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <ZoneAnalyticsCharts series={a.series} clubs={a.clubs} />

          <section>
            <h3 className="font-semibold text-navy-800 mb-2 inline-flex items-center gap-2">
              <Trophy size={14} className="text-amber-500" /> Club ranking
            </h3>
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs">
                  <tr>
                    <th className="text-left p-3">Rank</th>
                    <th className="text-left p-3">Club</th>
                    <th className="text-right p-3">Members</th>
                    <th className="text-right p-3">+30d</th>
                    <th className="text-right p-3">Activities · 30d</th>
                    <th className="text-right p-3">Beneficiaries</th>
                    <th className="text-right p-3">Funds raised</th>
                    <th className="text-right p-3">Attendance</th>
                    <th className="text-right p-3">Health</th>
                    <th className="text-right p-3">Dues</th>
                    <th className="text-right p-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {a.ranking.map((r) => {
                    const c = a.clubs.find((x) => x.id === r.id)!;
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="p-3"><RankBadge rank={r.rank} /></td>
                        <td className="p-3">
                          <div className="font-semibold text-navy-800">{c.name}</div>
                          {c.club_number && <div className="text-[10px] text-gray-500 font-mono">#{c.club_number}</div>}
                        </td>
                        <td className="p-3 text-right tabular-nums">{c.members}</td>
                        <td className="p-3 text-right tabular-nums text-emerald-700">{c.newMembers30d > 0 ? `+${c.newMembers30d}` : '—'}</td>
                        <td className="p-3 text-right tabular-nums">{c.activities30d}</td>
                        <td className="p-3 text-right tabular-nums">{c.beneficiaries.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right tabular-nums">₹{formatINRShort(c.fundsRaised)}</td>
                        <td className={`p-3 text-right tabular-nums ${c.attendancePct >= 70 ? 'text-emerald-700' : c.attendancePct >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>
                          {c.attendancePct}%
                        </td>
                        <td className={`p-3 text-right tabular-nums ${(c.healthScore ?? 0) >= 70 ? 'text-emerald-700' : (c.healthScore ?? 0) >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>
                          {c.healthScore ?? '—'}
                        </td>
                        <td className={`p-3 text-right tabular-nums ${c.duesPending > 0 ? 'text-rose-700' : 'text-gray-500'}`}>
                          {c.duesPending > 0 ? `₹${formatINRShort(c.duesPending)}` : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                            {r.score}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {a.predictions.some((p) => p.trend === 'down' && p.changePct < -15) && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 inline-flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                One or more metrics are projected to drop more than 15% in the next 3 months.
                Consider a zone advisory or extra cabinet visits to the lowest-ranked clubs.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-extrabold ${color ?? 'text-navy-900'}`}>{value}</div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const bg = rank === 1 ? 'bg-amber-500' : rank === 2 ? 'bg-gray-400' : rank === 3 ? 'bg-amber-700' : 'bg-gray-300';
  return (
    <div className={`w-8 h-8 rounded-full ${bg} text-white font-bold flex items-center justify-center text-xs`}>
      {rank}
    </div>
  );
}
