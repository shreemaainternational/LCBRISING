'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronRight, ChevronDown, Landmark, Boxes, Globe, Layers, MapPin, Building2,
  Pencil, Plus, Save, RotateCcw, Loader2, AlertTriangle, CheckSquare, Square, X,
  Trash2, MoveRight,
} from 'lucide-react';
import type { CaNode, MdNode, DistrictNode, RegionNode, ZoneNode, ClubNode } from './HierarchyExplorer';
import { HierarchyEditModal, type EditEntity } from './HierarchyEditModal';

/* ------------------------------------------------------------------ *
 * Flattened row model — the console renders the tree as an indented   *
 * table (Account Name · Type · Chairperson/Officer) like the portal,  *
 * with per-row Edit / Move / Remove plus batch reparent.              *
 * ------------------------------------------------------------------ */

type Kind = 'ca' | 'md' | 'district' | 'region' | 'zone' | 'club';
type NamedOpt = { id: string; code: string; name: string };

type FlatRow = {
  key: string;               // `${kind}:${id}`
  kind: Kind;
  id: string;
  name: string;
  chair: string | null;      // chairperson / officer / governor
  depth: number;
  districtId: string | null; // owning district (for scoping reparent targets)
  parentId: string | null;   // current parent id (region for zone, zone for club)
  ancestors: string[];       // expandable ancestor keys, for collapse visibility
  hasChildren: boolean;
  // Original nodes (whichever applies) so we can build an EditEntity.
  ca?: CaNode; md?: MdNode; district?: DistrictNode; region?: RegionNode; zone?: ZoneNode; club?: ClubNode;
};

type Opt = { id: string; label: string; districtId: string };

const KIND_META: Record<Kind, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; cls: string }> = {
  ca: { label: 'Constitutional Area', icon: Landmark, cls: 'text-rose-600' },
  md: { label: 'Multiple District', icon: Boxes, cls: 'text-navy-700' },
  district: { label: 'District', icon: Globe, cls: 'text-emerald-600' },
  region: { label: 'Region', icon: Layers, cls: 'text-purple-500' },
  zone: { label: 'Zone', icon: MapPin, cls: 'text-amber-500' },
  club: { label: 'Lions Club', icon: Building2, cls: 'text-blue-500' },
};

const DELETE_ENDPOINT: Record<Kind, (id: string) => string> = {
  ca: (id) => `/api/constitutional-areas/${id}`,
  md: (id) => `/api/multiple-districts/${id}`,
  district: (id) => `/api/crm/districts/${id}`,
  region: (id) => `/api/regions/${id}`,
  zone: (id) => `/api/zones/${id}`,
  club: (id) => `/api/crm/clubs/${id}`,
};

function collectDistricts(cas: CaNode[], looseMds: MdNode[], looseDistricts: DistrictNode[]): DistrictNode[] {
  const out: DistrictNode[] = [];
  const fromMd = (m: MdNode) => m.districts.forEach((d) => out.push(d));
  cas.forEach((c) => c.mds.forEach(fromMd));
  looseMds.forEach(fromMd);
  looseDistricts.forEach((d) => out.push(d));
  return out;
}

/** Build the full flat row list (all nodes, before collapse filtering). */
function buildRows(cas: CaNode[], looseMds: MdNode[], looseDistricts: DistrictNode[]): FlatRow[] {
  const rows: FlatRow[] = [];
  const pushClub = (c: ClubNode, depth: number, districtId: string, anc: string[]) => {
    rows.push({
      key: `club:${c.id}`, kind: 'club', id: c.id, name: c.name,
      chair: c.club_number ? `LCI #${c.club_number}` : null,
      depth, districtId, parentId: c.zone_id, ancestors: anc, hasChildren: false, club: c,
    });
  };
  const pushZone = (z: ZoneNode, depth: number, districtId: string, anc: string[]) => {
    const key = `zone:${z.id}`;
    rows.push({
      key, kind: 'zone', id: z.id, name: z.name, chair: z.chairperson_name,
      depth, districtId, parentId: z.region_id, ancestors: anc, hasChildren: z.clubs.length > 0, zone: z,
    });
    z.clubs.forEach((c) => pushClub(c, depth + 1, districtId, [...anc, key]));
  };
  const pushRegion = (r: RegionNode, depth: number, districtId: string, anc: string[]) => {
    const key = `region:${r.id}`;
    rows.push({
      key, kind: 'region', id: r.id, name: r.name, chair: r.chairperson_name,
      depth, districtId, parentId: null, ancestors: anc, hasChildren: r.zones.length > 0, region: r,
    });
    r.zones.forEach((z) => pushZone(z, depth + 1, districtId, [...anc, key]));
  };
  const pushDistrict = (d: DistrictNode, depth: number, anc: string[]) => {
    const key = `district:${d.id}`;
    const has = d.regions.length + d.looseZones.length + d.looseClubs.length > 0;
    rows.push({
      key, kind: 'district', id: d.id, name: `District ${d.code}`, chair: d.governor_name,
      depth, districtId: d.id, parentId: null, ancestors: anc, hasChildren: has, district: d,
    });
    const childAnc = [...anc, key];
    d.regions.forEach((r) => pushRegion(r, depth + 1, d.id, childAnc));
    d.looseZones.forEach((z) => pushZone(z, depth + 1, d.id, childAnc));
    d.looseClubs.forEach((c) => pushClub(c, depth + 1, d.id, childAnc));
  };
  const pushMd = (m: MdNode, depth: number, anc: string[]) => {
    const key = `md:${m.id}`;
    rows.push({
      key, kind: 'md', id: m.id, name: m.name, chair: m.council_chairperson_name,
      depth, districtId: null, parentId: null, ancestors: anc, hasChildren: m.districts.length > 0, md: m,
    });
    m.districts.forEach((d) => pushDistrict(d, depth + 1, [...anc, key]));
  };
  cas.forEach((c) => {
    const key = `ca:${c.id}`;
    rows.push({
      key, kind: 'ca', id: c.id, name: c.name, chair: null,
      depth: 0, districtId: null, parentId: null, ancestors: [], hasChildren: c.mds.length > 0, ca: c,
    });
    c.mds.forEach((m) => pushMd(m, 1, [key]));
  });
  looseMds.forEach((m) => pushMd(m, 0, []));
  looseDistricts.forEach((d) => pushDistrict(d, 0, []));
  return rows;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* cookie fallback */ }
  return headers;
}

export function RegionZoneConsole({
  cas = [], looseMds = [], looseDistricts = [],
}: { cas?: CaNode[]; looseMds?: MdNode[]; looseDistricts?: DistrictNode[] }) {
  const router = useRouter();
  const allRows = useMemo(() => buildRows(cas, looseMds, looseDistricts), [cas, looseMds, looseDistricts]);
  const districtNodes = useMemo(() => collectDistricts(cas, looseMds, looseDistricts), [cas, looseMds, looseDistricts]);

  // District-scoped rich option lists for the edit modal's re-parent selects.
  const regionsByDistrict = useMemo(() => {
    const m = new Map<string, NamedOpt[]>();
    for (const d of districtNodes) m.set(d.id, d.regions.map((r) => ({ id: r.id, code: r.code, name: r.name })));
    return m;
  }, [districtNodes]);
  const zonesByDistrict = useMemo(() => {
    const m = new Map<string, NamedOpt[]>();
    for (const d of districtNodes) {
      const zs = [...d.regions.flatMap((r) => r.zones), ...d.looseZones].map((z) => ({ id: z.id, code: z.code, name: z.name }));
      m.set(d.id, zs);
    }
    return m;
  }, [districtNodes]);

  // Expandable node keys (everything with children). Default: all expanded.
  const expandableKeys = useMemo(() => allRows.filter((r) => r.hasChildren).map((r) => r.key), [allRows]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Selection (zones + clubs only) for batch reparent.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Staged, uncommitted reparents:  rowKey -> new parent id (or null = detach).
  const [staged, setStaged] = useState<Map<string, string | null>>(new Map());

  // Reparent picker — moves an explicit set of rows of one kind.
  const [picker, setPicker] = useState<null | { kind: 'zone' | 'club'; rows: FlatRow[] }>(null);

  // Inline edit modal.
  const [editing, setEditing] = useState<EditEntity | null>(null);

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Region / zone option lists (flat) for staged-label lookups + picker scope.
  const regionOpts: Opt[] = useMemo(
    () => allRows.filter((r) => r.kind === 'region').map((r) => ({ id: r.id, label: r.name, districtId: r.districtId! })),
    [allRows],
  );
  const zoneOpts: Opt[] = useMemo(
    () => allRows.filter((r) => r.kind === 'zone').map((r) => ({ id: r.id, label: r.name, districtId: r.districtId! })),
    [allRows],
  );

  // Visible rows: hide anything whose ancestor is collapsed.
  const visible = useMemo(
    () => allRows.filter((r) => !r.ancestors.some((a) => collapsed.has(a))),
    [allRows, collapsed],
  );

  const selectedZones = allRows.filter((r) => r.kind === 'zone' && selected.has(r.key));
  const selectedClubs = allRows.filter((r) => r.kind === 'club' && selected.has(r.key));

  function toggleCollapse(key: string) {
    setCollapsed((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }
  function expandAll() { setCollapsed(new Set()); }
  function collapseAll() { setCollapsed(new Set(expandableKeys)); }
  function toggleSelect(key: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }

  /** Open the reparent picker for an explicit set of rows (batch or single). */
  function openReparent(kind: 'zone' | 'club', rows: FlatRow[]) {
    setError(null);
    if (rows.length === 0) { setError(`Select one or more ${kind}s first (tick the checkboxes).`); return; }
    const districts = new Set(rows.map((r) => r.districtId));
    if (districts.size > 1) { setError(`Selected ${kind}s span multiple districts. Reparent within one district at a time.`); return; }
    setPicker({ kind, rows });
  }

  function applyReparent(targetId: string | null) {
    const { rows } = picker!;
    setStaged((prev) => {
      const next = new Map(prev);
      for (const r of rows) {
        if ((r.parentId ?? null) === targetId) next.delete(r.key); // no-op → drop from staging
        else next.set(r.key, targetId);
      }
      return next;
    });
    setPicker(null);
    setSelected(new Set());
  }

  function startOver() { setStaged(new Map()); setSelected(new Set()); setError(null); setSaved(null); }

  function save() {
    setError(null); setSaved(null);
    if (staged.size === 0) { setError('Nothing to save — no pending changes.'); return; }
    start(async () => {
      const headers = await authHeaders();
      let ok = 0; const fails: string[] = [];
      for (const [key, targetId] of staged.entries()) {
        const [kind, id] = key.split(':');
        const endpoint = kind === 'zone' ? `/api/zones/${id}` : `/api/crm/clubs/${id}`;
        const body = kind === 'zone' ? { region_id: targetId } : { zone_id: targetId };
        try {
          const res = await fetch(endpoint, { method: 'PATCH', headers, body: JSON.stringify(body) });
          if (res.ok) ok++;
          else { const j = await res.json().catch(() => ({})); fails.push(typeof j.error === 'string' ? j.error : `${kind} ${id}: ${res.status}`); }
        } catch { fails.push(`${kind} ${id}: network error`); }
      }
      if (fails.length) setError(`Saved ${ok}. Failed ${fails.length}: ${fails[0]}${fails.length > 1 ? ` (+${fails.length - 1} more)` : ''}`);
      else setSaved(`Saved ${ok} change${ok === 1 ? '' : 's'}.`);
      setStaged(new Map());
      router.refresh();
    });
  }

  /** Build an EditEntity for the inline edit modal from a row's stored node. */
  function editEntityFor(row: FlatRow): EditEntity | null {
    switch (row.kind) {
      case 'ca': return { type: 'ca', id: row.id, name: row.ca!.name, code: row.ca!.code };
      case 'md': return { type: 'md', id: row.id, name: row.md!.name, code: row.md!.code, country: row.md!.country, council_chairperson_name: row.md!.council_chairperson_name };
      case 'district': return { type: 'district', id: row.id, code: row.district!.code, name: row.district!.name, governor_name: row.district!.governor_name, lions_year: row.district!.lions_year };
      case 'region': return { type: 'region', id: row.id, code: row.region!.code, name: row.region!.name, chairperson_name: row.region!.chairperson_name };
      case 'zone': return { type: 'zone', id: row.id, code: row.zone!.code, name: row.zone!.name, chairperson_name: row.zone!.chairperson_name, region_id: row.zone!.region_id, regions: regionsByDistrict.get(row.districtId ?? '') ?? [] };
      case 'club': return { type: 'club', id: row.id, name: row.club!.name, club_number: row.club!.club_number, city: row.club!.city, state: row.club!.state, zone_id: row.club!.zone_id, zones: zonesByDistrict.get(row.districtId ?? '') ?? [] };
    }
  }

  /** Remove (soft-delete) a node. Server enforces no-orphan guards. */
  function remove(row: FlatRow) {
    const meta = KIND_META[row.kind];
    if (!window.confirm(`Remove ${meta.label.toLowerCase()} “${row.name}”? This can be restored by an admin.`)) return;
    setError(null); setSaved(null);
    start(async () => {
      try {
        const res = await fetch(DELETE_ENDPOINT[row.kind](row.id), { method: 'DELETE', headers: await authHeaders() });
        if (res.ok) { setSaved(`Removed “${row.name}”.`); router.refresh(); }
        else { const j = await res.json().catch(() => ({})); setError(typeof j.error === 'string' ? j.error : `Remove failed (${res.status}).`); }
      } catch { setError('Network error while removing.'); }
    });
  }

  // Consistency count.
  const inconsistencies = useMemo(() => {
    let n = 0;
    for (const d of districtNodes) {
      const districtHasZones = d.regions.some((r) => r.zones.length) || d.looseZones.length > 0;
      if (d.regions.length) n += d.looseZones.length;
      if (districtHasZones) n += d.looseClubs.length;
    }
    return n;
  }, [districtNodes]);

  const stagedLabel = (row: FlatRow): string | null => {
    if (!staged.has(row.key)) return null;
    const target = staged.get(row.key)!;
    if (target === null) return 'detach';
    const opt = (row.kind === 'zone' ? regionOpts : zoneOpts).find((o) => o.id === target);
    return opt ? `→ ${opt.label}` : '→ (moved)';
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={() => openReparent('zone', selectedZones)} icon={MapPin} tone="amber" disabled={pending}>
          Reparent Zone{selectedZones.length ? ` (${selectedZones.length})` : ''}
        </Btn>
        <Btn onClick={() => openReparent('club', selectedClubs)} icon={Building2} tone="blue" disabled={pending}>
          Reparent Club{selectedClubs.length ? ` (${selectedClubs.length})` : ''}
        </Btn>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <Btn onClick={expandAll} icon={ChevronDown} tone="gray">Expand All</Btn>
        <Btn onClick={collapseAll} icon={ChevronRight} tone="gray">Collapse All</Btn>
        <div className="flex-1" />
        <Btn onClick={startOver} icon={RotateCcw} tone="gray" disabled={pending || staged.size === 0}>Start Over</Btn>
        <button type="button" onClick={save} disabled={pending || staged.size === 0}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold disabled:opacity-50">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {pending ? 'Saving…' : `Save${staged.size ? ` (${staged.size})` : ''}`}
        </button>
      </div>

      {(error || saved) && (
        <div className={`text-xs px-3 py-2 rounded-md inline-flex items-center gap-1.5 ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {error ? <AlertTriangle size={13} /> : <CheckSquare size={13} />} {error || saved}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-navy-900 text-white text-[11px] font-bold uppercase tracking-wide">
          <span className="w-6 shrink-0" />
          <span className="flex-1">Account Name</span>
          <span className="hidden lg:block w-36 shrink-0">Chairperson / Officer</span>
          <span className="w-[132px] shrink-0 text-center">Actions</span>
          <span className="w-24 md:w-28 shrink-0 text-right">Type</span>
        </div>

        {visible.map((row) => {
          const meta = KIND_META[row.kind];
          const selectable = row.kind === 'zone' || row.kind === 'club';
          const isSel = selected.has(row.key);
          const pend = stagedLabel(row);
          const isCollapsed = collapsed.has(row.key);
          return (
            <div key={row.key}
              className={`group flex items-center gap-2 py-2 pr-3 border-t text-sm ${pend ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
              style={{ paddingLeft: `${row.depth * 20 + 8}px` }}
            >
              {/* expand / collapse */}
              <button type="button" className="w-5 h-5 shrink-0 flex items-center justify-center text-gray-400"
                onClick={() => row.hasChildren && toggleCollapse(row.key)}
                aria-label={row.hasChildren ? (isCollapsed ? 'Expand' : 'Collapse') : undefined}>
                {row.hasChildren ? (isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />) : null}
              </button>

              {/* batch-select (zones + clubs) */}
              {selectable ? (
                <button type="button" onClick={() => toggleSelect(row.key)} className="shrink-0 text-gray-500 hover:text-emerald-600" aria-label="Select">
                  {isSel ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                </button>
              ) : <span className="w-4 shrink-0" />}

              <meta.icon size={16} className={`${meta.cls} shrink-0`} />
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span className="font-semibold text-navy-800 truncate">{row.name}</span>
                {pend && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    <Pencil size={10} /> {pend}
                  </span>
                )}
              </div>

              <span className="hidden lg:block w-36 shrink-0 truncate text-xs text-gray-500">{row.chair || '—'}</span>

              {/* per-row actions */}
              <div className="w-[132px] shrink-0 flex items-center justify-center gap-1">
                {row.kind === 'zone' && (
                  <IconBtn title="Move to region" onClick={() => openReparent('zone', [row])} disabled={pending} className="text-amber-600 hover:bg-amber-50">
                    <MoveRight size={14} />
                  </IconBtn>
                )}
                {row.kind === 'club' && (
                  <IconBtn title="Move to zone" onClick={() => openReparent('club', [row])} disabled={pending} className="text-blue-600 hover:bg-blue-50">
                    <MoveRight size={14} />
                  </IconBtn>
                )}
                <IconBtn title="Edit" onClick={() => { const e = editEntityFor(row); if (e) setEditing(e); }} disabled={pending} className="text-gray-600 hover:bg-gray-100 hover:text-emerald-700">
                  <Pencil size={14} />
                </IconBtn>
                <IconBtn title="Remove" onClick={() => remove(row)} disabled={pending} className="text-gray-500 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </IconBtn>
              </div>

              <span className="w-24 md:w-28 shrink-0 text-right text-xs font-medium text-gray-500">{meta.label}</span>
            </div>
          );
        })}
        {visible.length === 0 && <div className="px-4 py-6 text-sm text-gray-500">No structure yet.</div>}
      </div>

      {/* Consistency legend */}
      <p className="flex items-start gap-1.5 text-xs text-gray-500">
        <AlertTriangle size={12} className={`mt-0.5 shrink-0 ${inconsistencies ? 'text-amber-500' : 'text-gray-300'}`} />
        <span>
          <strong>District structure must be consistent:</strong> if zones exist, every club must be assigned to a zone;
          if regions exist, every zone must be parented to a region.
          {inconsistencies > 0
            ? <> Currently <strong>{inconsistencies}</strong> item(s) need re-parenting — use <strong>Move</strong> on the row (or tick several and <strong>Reparent</strong>).</>
            : <> All nodes are consistent.</>}
        </span>
      </p>

      {picker && (
        <ReparentPicker
          kind={picker.kind}
          selectionDistrict={picker.rows[0]?.districtId ?? null}
          options={(picker.kind === 'zone' ? regionOpts : zoneOpts)}
          count={picker.rows.length}
          onClose={() => setPicker(null)}
          onApply={applyReparent}
        />
      )}

      {editing && (
        <HierarchyEditModal
          entity={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setSaved('Saved changes.'); router.refresh(); }}
        />
      )}
    </div>
  );
}

function Btn({
  children, onClick, icon: Icon, tone, disabled,
}: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: 'amber' | 'blue' | 'gray';
}) {
  const tones = {
    amber: 'border-amber-200 text-amber-700 hover:bg-amber-50',
    blue: 'border-blue-200 text-blue-700 hover:bg-blue-50',
    gray: 'border-gray-200 text-gray-700 hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold disabled:opacity-50 ${tones[tone]}`}>
      <Icon size={13} /> {children}
    </button>
  );
}

function IconBtn({
  children, onClick, title, disabled, className = '',
}: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className={`w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-40 ${className}`}>
      {children}
    </button>
  );
}

function ReparentPicker({
  kind, selectionDistrict, options, count, onClose, onApply,
}: {
  kind: 'zone' | 'club';
  selectionDistrict: string | null;
  options: Opt[];
  count: number;
  onClose: () => void;
  onApply: (targetId: string | null) => void;
}) {
  const [target, setTarget] = useState<string>('');
  const scoped = options.filter((o) => o.districtId === selectionDistrict);
  const parentLabel = kind === 'zone' ? 'region' : 'zone';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-navy-800">Move {count} {kind}{count === 1 ? '' : 's'} to {parentLabel}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-700 mb-1">Target {parentLabel}</span>
            <select className="w-full px-3 py-2 border rounded-md text-sm bg-white" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— detach (no {parentLabel}) —</option>
              {scoped.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          {scoped.length === 0 && (
            <p className="text-xs text-amber-700 inline-flex items-center gap-1.5">
              <AlertTriangle size={13} /> No {parentLabel}s exist in this district yet — create one first, or detach.
            </p>
          )}
          <p className="text-[11px] text-gray-400">This stages the change. Click <strong>Save</strong> to commit.</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => onApply(target || null)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold">
            <Plus size={14} /> Stage change
          </button>
        </div>
      </div>
    </div>
  );
}
