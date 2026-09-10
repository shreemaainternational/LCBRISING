'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MoveRight, RefreshCw, Sparkles, Loader2, AlertCircle,
  CheckCircle2, History, Activity, MapPin, ChevronDown,
} from 'lucide-react';

export interface ClubRow {
  id: string;
  name: string;
  club_number: string | null;
  category: string | null;
  zone_id: string | null;
  district_id: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  health_score: number | null;
  health_assessed_at: string | null;
  health_commentary: string | null;
  assistant_chair_member_id: string | null;
}

export interface ZoneRow {
  id: string;
  code: string;
  name: string;
  district_id: string;
  chairperson_name: string | null;
  chairperson_member_id: string | null;
  assistant_chair_member_id: string | null;
}

interface DistrictRow { id: string; code: string; name: string | null }

interface HistoryRow {
  id: string; club_id: string; action: string;
  from_zone_id: string | null; to_zone_id: string | null;
  reason: string | null; performed_at: string;
  clubs?: { name?: string } | null;
}

interface Props {
  clubs: ClubRow[];
  zones: ZoneRow[];
  districts: DistrictRow[];
  history: HistoryRow[];
}

const CLUB_CATEGORIES = [
  'service', 'leadership', 'young_lions', 'leo_club',
  'specialty', 'satellite', 'cyber', 'campus', 'corporate',
];

const RISK_PILL = (s: number | null): { label: string; cls: string } => {
  if (s == null)   return { label: 'New',       cls: 'bg-gray-100 text-gray-500' };
  if (s >= 85)     return { label: 'Thriving',  cls: 'bg-emerald-100 text-emerald-700' };
  if (s >= 70)     return { label: 'Healthy',   cls: 'bg-lime-100 text-lime-700' };
  if (s >= 50)     return { label: 'Watch',     cls: 'bg-amber-100 text-amber-800' };
  if (s >= 30)     return { label: 'At risk',   cls: 'bg-orange-100 text-orange-700' };
  return            { label: 'Critical',  cls: 'bg-rose-100 text-rose-700' };
};

export function GovernanceConsole({ clubs: initialClubs, zones, districts, history }: Props) {
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubRow[]>(initialClubs);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterZone, setFilterZone] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'assign' | 'health' | 'history'>('assign');
  const [pending, start] = useTransition();
  const [aiPending, startAi] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const districtById = new Map(districts.map((d) => [d.id, d]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));

  const filtered = useMemo(() => {
    return clubs.filter((c) => {
      if (filterZone === '__none__' && c.zone_id) return false;
      if (filterZone && filterZone !== '__none__' && c.zone_id !== filterZone) return false;
      if (filterDistrict && c.district_id !== filterDistrict) return false;
      if (filterRisk) {
        const pill = RISK_PILL(c.health_score).label.toLowerCase().replace(/\s/g, '_');
        if (pill !== filterRisk) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!c.name.toLowerCase().includes(s) && !(c.club_number ?? '').toLowerCase().includes(s) && !(c.city ?? '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [clubs, filterZone, filterDistrict, filterRisk, search]);

  const stats = useMemo(() => {
    const unassigned = clubs.filter((c) => !c.zone_id).length;
    const totalScore = clubs.reduce((a, b) => a + (b.health_score ?? 0), 0);
    const scored = clubs.filter((c) => c.health_score != null).length;
    const avg = scored ? Math.round(totalScore / scored) : null;
    const critical = clubs.filter((c) => (c.health_score ?? 100) < 30).length;
    return { total: clubs.length, unassigned, avg, critical };
  }, [clubs]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (filtered.every((c) => selected.has(c.id))) {
      setSelected((s) => { const next = new Set(s); filtered.forEach((c) => next.delete(c.id)); return next; });
    } else {
      setSelected((s) => { const next = new Set(s); filtered.forEach((c) => next.add(c.id)); return next; });
    }
  }

  function reassign(toZoneId: string | null, reason?: string) {
    if (selected.size === 0) { setNotice({ ok: false, msg: 'Select at least one club.' }); return; }
    setNotice(null);
    start(async () => {
      const res = await fetch('/api/admin/governance/reassign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_ids: Array.from(selected),
          to_zone_id: toZoneId,
          reason,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice({ ok: false, msg: j.error ?? `HTTP ${res.status}` }); return; }
      // Update local state
      setClubs((cur) => cur.map((c) => {
        if (!selected.has(c.id)) return c;
        const z = toZoneId ? zoneById.get(toZoneId) : null;
        return { ...c, zone_id: toZoneId, district_id: z?.district_id ?? c.district_id };
      }));
      setNotice({ ok: true, msg: `Reassigned ${j.reassigned} club${j.reassigned === 1 ? '' : 's'}.` });
      setSelected(new Set());
      router.refresh();
    });
  }

  function recomputeHealth(scope: 'all' | 'selected', withAi = false) {
    setNotice(null);
    const fn = withAi ? startAi : start;
    fn(async () => {
      const body: Record<string, unknown> = { scope: 'all', with_ai: withAi };
      if (scope === 'selected') {
        if (!selected.size) { setNotice({ ok: false, msg: 'Select clubs first.' }); return; }
        // run one at a time for selected; cheap given small N
        for (const id of selected) {
          await fetch('/api/admin/governance/health', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope: 'club', club_id: id, with_ai: withAi }),
          });
        }
      } else {
        const res = await fetch('/api/admin/governance/health', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setNotice({ ok: false, msg: j.error ?? `HTTP ${res.status}` });
          return;
        }
      }
      setNotice({ ok: true, msg: withAi ? 'Health recomputed with AI commentary.' : 'Health scores refreshed.' });
      router.refresh();
    });
  }

  async function setCategory(clubId: string, category: string) {
    start(async () => {
      await fetch(`/api/admin/governance/club/${clubId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category || null }),
      });
      setClubs((cur) => cur.map((c) => c.id === clubId ? { ...c, category: category || null } : c));
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total clubs"      value={String(stats.total)}        color="text-navy-900" />
        <Kpi label="Unassigned"       value={String(stats.unassigned)}   color={stats.unassigned ? 'text-rose-700' : 'text-emerald-700'} />
        <Kpi label="Avg health"       value={stats.avg == null ? '—' : `${stats.avg}/100`} color="text-blue-700" />
        <Kpi label="Critical clubs"   value={String(stats.critical)}     color={stats.critical ? 'text-rose-700' : 'text-emerald-700'} />
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b">
        <TabBtn active={tab === 'assign'} onClick={() => setTab('assign')} label="Assignments" />
        <TabBtn active={tab === 'health'} onClick={() => setTab('health')} label="Club Health" />
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')} label={`History (${history.length})`} />
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border p-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clubs…"
          className="px-3 py-1.5 border rounded text-sm w-56" />
        <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
          className="px-2 py-1.5 border rounded text-sm">
          <option value="">All zones</option>
          <option value="__none__">— Unassigned —</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)}
          className="px-2 py-1.5 border rounded text-sm">
          <option value="">All districts</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}
        </select>
        <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}
          className="px-2 py-1.5 border rounded text-sm">
          <option value="">All risk levels</option>
          <option value="thriving">Thriving</option>
          <option value="healthy">Healthy</option>
          <option value="watch">Watch</option>
          <option value="at_risk">At risk</option>
          <option value="critical">Critical</option>
        </select>
        <span className="text-xs text-gray-500 ml-auto">
          {filtered.length} of {clubs.length} clubs · {selected.size} selected
        </span>
      </div>

      {notice && (
        <p className={`text-xs px-3 py-2 rounded border inline-flex items-center gap-1.5 ${
          notice.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notice.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {notice.msg}
        </p>
      )}

      {tab === 'assign' && (
        <AssignmentBar
          selectedCount={selected.size}
          zones={zones}
          districtById={districtById}
          pending={pending}
          onReassign={reassign}
        />
      )}

      {tab === 'health' && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => recomputeHealth('all')} disabled={pending || aiPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold disabled:opacity-60">
            {pending ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
            Recompute all health scores
          </button>
          <button type="button" onClick={() => recomputeHealth('selected', true)} disabled={aiPending || pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-60">
            {aiPending ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
            Re-score selected with AI commentary
          </button>
        </div>
      )}

      {tab !== 'history' ? (
        <ClubTable
          clubs={filtered}
          zones={zones}
          districts={districtById}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onCategory={setCategory}
          showHealthDetail={tab === 'health'}
        />
      ) : (
        <HistoryList history={history} zones={zoneById} />
      )}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors ${
        active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-navy-800'
      }`}
    >
      {label}
    </button>
  );
}

function AssignmentBar({ selectedCount, zones, districtById, pending, onReassign }: {
  selectedCount: number;
  zones: ZoneRow[];
  districtById: Map<string, DistrictRow>;
  pending: boolean;
  onReassign: (toZoneId: string | null, reason?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState<string>('');

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
      <div className="text-sm font-semibold text-blue-900 inline-flex items-center gap-2">
        <Building2 size={14} /> {selectedCount} selected
      </div>
      <div className="relative inline-block">
        <button type="button" onClick={() => setOpen((o) => !o)}
          disabled={selectedCount === 0 || pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
          <MoveRight size={13} /> Reassign to…
          <ChevronDown size={13} />
        </button>
        {open && (
          <div className="absolute left-0 mt-1 w-72 bg-white border rounded-lg shadow-lg z-10 p-3 space-y-2">
            <select value={target} onChange={(e) => setTarget(e.target.value)}
              className="w-full px-2 py-1.5 border rounded text-sm">
              <option value="">— pick target —</option>
              <option value="__none__">— Unassign (no zone) —</option>
              {zones.map((z) => {
                const d = districtById.get(z.district_id);
                return <option key={z.id} value={z.id}>{z.name} {d ? `· ${d.code}` : ''}</option>;
              })}
            </select>
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)" className="w-full px-2 py-1.5 border rounded text-sm" />
            <div className="flex items-center gap-2">
              <button type="button" disabled={!target || pending}
                onClick={() => { onReassign(target === '__none__' ? null : target, reason || undefined); setOpen(false); setReason(''); setTarget(''); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
                {pending ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle2 size={13} />} Confirm
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md border text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
      <span className="text-xs text-blue-800/80">Tip: filter by &ldquo;Unassigned&rdquo; to onboard new clubs.</span>
    </div>
  );
}

function ClubTable({
  clubs, zones, districts, selected, onToggle, onToggleAll, onCategory, showHealthDetail,
}: {
  clubs: ClubRow[];
  zones: ZoneRow[];
  districts: Map<string, DistrictRow>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onCategory: (id: string, c: string) => void;
  showHealthDetail: boolean;
}) {
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const allSelected = clubs.length > 0 && clubs.every((c) => selected.has(c.id));

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 w-10">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            </th>
            <th className="text-left p-3">Club</th>
            <th className="text-left p-3">Zone · District</th>
            <th className="text-left p-3">Category</th>
            <th className="text-right p-3">Health</th>
            {showHealthDetail && <th className="text-left p-3">Commentary</th>}
          </tr>
        </thead>
        <tbody>
          {clubs.length === 0 ? (
            <tr><td colSpan={showHealthDetail ? 6 : 5} className="p-6 text-center text-sm text-gray-500">No clubs match the filters.</td></tr>
          ) : clubs.map((c) => {
            const z = c.zone_id ? zoneById.get(c.zone_id) : null;
            const d = c.district_id ? districts.get(c.district_id) : null;
            const pill = RISK_PILL(c.health_score);
            return (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="p-3"><input type="checkbox" checked={selected.has(c.id)} onChange={() => onToggle(c.id)} /></td>
                <td className="p-3">
                  <div className="font-semibold text-navy-800 inline-flex items-center gap-1.5">
                    <Building2 size={13} className="text-blue-500" /> {c.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.club_number ? `#${c.club_number} · ` : ''}{c.city ?? '—'}{c.state ? `, ${c.state}` : ''}
                  </div>
                </td>
                <td className="p-3 text-xs">
                  {z ? (
                    <>
                      <div className="font-medium text-gray-800 inline-flex items-center gap-1"><MapPin size={11} /> {z.name}</div>
                      <div className="text-gray-500">{d?.code ?? '—'}</div>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-semibold"><AlertCircle size={11} /> Unassigned</span>
                  )}
                </td>
                <td className="p-3">
                  <select value={c.category ?? ''} onChange={(e) => onCategory(c.id, e.target.value)}
                    className="text-xs px-2 py-1 border rounded">
                    <option value="">—</option>
                    {CLUB_CATEGORIES.map((k) => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex flex-col items-end">
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${pill.cls}`}>
                      <Activity size={10} /> {pill.label}
                    </span>
                    <span className="text-sm font-bold text-navy-800 mt-1">
                      {c.health_score == null ? '—' : `${c.health_score}/100`}
                    </span>
                    {c.health_assessed_at && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.health_assessed_at).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </td>
                {showHealthDetail && (
                  <td className="p-3 text-xs text-gray-700 max-w-md">
                    {c.health_commentary ?? <span className="text-gray-400 italic">Run &ldquo;Re-score with AI commentary&rdquo; to populate.</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoryList({ history, zones }: { history: HistoryRow[]; zones: Map<string, ZoneRow> }) {
  if (!history.length) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center text-sm text-gray-500">
        No assignment activity yet.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">When</th>
            <th className="text-left p-3">Club</th>
            <th className="text-left p-3">Action</th>
            <th className="text-left p-3">From → To</th>
            <th className="text-left p-3">Reason</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id} className="border-t">
              <td className="p-3 text-xs text-gray-600">{new Date(h.performed_at).toLocaleString('en-IN')}</td>
              <td className="p-3 font-medium">{h.clubs?.name ?? h.club_id.slice(0, 8)}</td>
              <td className="p-3 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">
                  <History size={10} /> {h.action.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="p-3 text-xs text-gray-600">
                {(h.from_zone_id ? zones.get(h.from_zone_id)?.name : null) ?? 'Unassigned'}
                {' '}<span className="text-gray-400">→</span>{' '}
                {(h.to_zone_id ? zones.get(h.to_zone_id)?.name : null) ?? 'Unassigned'}
              </td>
              <td className="p-3 text-xs text-gray-600">{h.reason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Type re-exports used by `page.tsx` so it can pass typed props.
export type { DistrictRow };
export type { HistoryRow };
