import { requireZoneChair } from '@/lib/zone-portal';
import { getZoneAwardEligibility } from '@/lib/zone-awards';
import { ZoneTabs } from '../ZoneTabs';
import { Trophy, Check, X, Award } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ZoneAwardsPage() {
  const ctx = await requireZoneChair();
  const clubs = await getZoneAwardEligibility(ctx.zone.id);

  const allEligibleCount = clubs.reduce(
    (a, c) => a + c.awards.filter((x) => x.eligible).length, 0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight inline-flex items-center gap-2">
          <Trophy className="text-amber-500" size={28} /> Award Eligibility
        </h2>
        <p className="text-gray-600 text-sm mt-1 max-w-3xl">
          Tracks each club in Zone {ctx.zone.code} against the canonical
          Lions International awards. Scores recompute from live CRM data —
          membership growth, activities, attendance, dues compliance.
          Thresholds in this engine approximate the published criteria —
          tune them in <code>src/lib/zone-awards.ts</code> for your district.
        </p>
      </div>
      <ZoneTabs />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Clubs tracked" value={clubs.length} />
        <KpiTile label="Awards earned" value={allEligibleCount}
          color={allEligibleCount > 0 ? 'text-emerald-700' : 'text-gray-500'} />
        <KpiTile label="Avg eligibility"
          value={`${Math.round((clubs.reduce((a, c) => a + c.overallPct, 0) / Math.max(1, clubs.length)))}%`} />
        <KpiTile label="Top club"
          value={clubs[0]?.name?.replace(/^Lions Clubs? of\s+/i, '') ?? '—'}
          color="text-amber-700" small />
      </div>

      {clubs.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
          No clubs in this zone yet.
        </div>
      ) : (
        <div className="space-y-4">
          {clubs.map((c) => (
            <article key={c.id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-navy-800 inline-flex items-center gap-2">
                    <Award size={16} className="text-amber-500" /> {c.name}
                  </h3>
                  <div className="text-xs text-gray-500">
                    {c.members} members
                    {c.club_number && <> · #{c.club_number}</>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-extrabold ${
                    c.overallPct >= 80 ? 'text-emerald-700' :
                    c.overallPct >= 50 ? 'text-amber-700'   : 'text-rose-700'
                  }`}>
                    {c.overallPct}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                    Overall eligibility
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {c.awards.map((a) => (
                  <div key={a.key} className={`border rounded-lg p-3 ${a.eligible ? 'border-emerald-300 bg-emerald-50/40' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm text-navy-800 flex items-center gap-1.5">
                        {a.eligible && <Trophy size={12} className="text-amber-500" />}
                        {a.label}
                      </div>
                      <span className={`text-xs font-bold ${
                        a.eligible ? 'text-emerald-700' : a.percent >= 50 ? 'text-amber-700' : 'text-gray-500'
                      }`}>{a.percent}%</span>
                    </div>
                    <ul className="space-y-1">
                      {a.criteria.map((x) => (
                        <li key={x.criterion.key} className="flex items-start gap-1.5 text-xs">
                          {x.met
                            ? <Check size={11} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                            : <X size={11} className="text-rose-600 mt-0.5 flex-shrink-0" />}
                          <span className={x.met ? 'text-gray-700' : 'text-gray-500'}>
                            {x.criterion.label}
                            <span className="text-gray-400 ml-1">
                              ({fmt(x.current, x.criterion.unit)} / {fmt(x.criterion.threshold, x.criterion.unit)})
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function fmt(n: number, unit: string): string {
  if (unit === 'binary') return n >= 1 ? 'yes' : 'no';
  if (unit === 'percent') return `${n}%`;
  return n.toLocaleString('en-IN');
}

function KpiTile({ label, value, color, small }: { label: string; value: string | number; color?: string; small?: boolean }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`${small ? 'text-lg' : 'text-2xl'} font-extrabold ${color ?? 'text-navy-900'}`}>{value}</div>
    </div>
  );
}
