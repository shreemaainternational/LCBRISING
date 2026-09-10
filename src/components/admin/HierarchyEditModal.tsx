'use client';

import { createContext, useState, useTransition } from 'react';
import { X, Loader2, Save, AlertCircle, Building2, Search, CheckSquare, Square, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/** A node the hierarchy explorer can edit inline. */
export type EditEntity =
  | { type: 'ca'; id: string; name: string; code: string }
  | { type: 'md'; id: string; name: string; code: string; country: string | null; council_chairperson_name: string | null }
  | { type: 'district'; id: string; code: string; name: string; governor_name: string | null; lions_year: string | null }
  | { type: 'region'; id: string; code: string; name: string; chairperson_name: string | null }
  | { type: 'zone'; id: string; code: string; name: string; chairperson_name: string | null;
      region_id: string | null; regions: { id: string; code: string; name: string }[];
      /** All clubs in the zone's district — for the assign-clubs checklist. */
      clubs?: { id: string; name: string; club_number: string | null; zone_id: string | null }[] }
  | { type: 'club'; id: string; name: string; club_number: string | null; city: string | null; state: string | null;
      zone_id: string | null; zones: { id: string; code: string; name: string }[];
      /** All members — for the assign-members dropdown in the club editor. */
      members?: { id: string; name: string; club_id: string | null; club_name: string | null }[] }
  | { type: 'member'; id: string; name: string; email: string | null; phone: string | null; status: string | null };

/** Provided by the explorer; opens the edit modal for a node. */
export const HierarchyEditContext = createContext<(e: EditEntity) => void>(() => {});

const TYPE_LABEL: Record<EditEntity['type'], string> = {
  ca: 'constitutional area', md: 'multiple district', district: 'district', region: 'region',
  zone: 'zone', club: 'club', member: 'member',
};

const STATUSES = ['pending', 'active', 'lapsed', 'suspended'];

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* fall back to cookie auth */ }
  return headers;
}

/** Endpoint + payload builder per entity type. */
function endpointFor(e: EditEntity): string {
  switch (e.type) {
    case 'ca': return `/api/constitutional-areas/${e.id}`;
    case 'md': return `/api/multiple-districts/${e.id}`;
    case 'district': return `/api/crm/districts/${e.id}`;
    case 'region': return `/api/regions/${e.id}`;
    case 'zone': return `/api/zones/${e.id}`;
    case 'club': return `/api/crm/clubs/${e.id}`;
    case 'member': return `/api/crm/members/${e.id}`;
  }
}

type Opt = { value: string; label: string };
type Field = { key: string; label: string; type?: 'text' | 'select'; options?: Opt[]; required?: boolean };

function fieldsFor(e: EditEntity): Field[] {
  switch (e.type) {
    case 'ca': return [
      { key: 'name', label: 'Name', required: true }, { key: 'code', label: 'Code' },
    ];
    case 'md': return [
      { key: 'name', label: 'Name', required: true }, { key: 'code', label: 'Code' },
      { key: 'country', label: 'Country' }, { key: 'council_chairperson_name', label: 'Council Chairperson' },
    ];
    case 'district': return [
      { key: 'code', label: 'District Code', required: true }, { key: 'name', label: 'District Name', required: true },
      { key: 'governor_name', label: 'Governor' }, { key: 'lions_year', label: 'Lions Year' },
    ];
    case 'region': return [
      { key: 'name', label: 'Region Name', required: true }, { key: 'code', label: 'Code' },
      { key: 'chairperson_name', label: 'Region Chairperson' },
    ];
    case 'zone': return [
      { key: 'name', label: 'Zone Name', required: true }, { key: 'code', label: 'Code' },
      // Parent region — required for consistency when the district has regions.
      { key: 'region_id', label: 'Region (parent)', type: 'select',
        options: [{ value: '', label: '— none —' }, ...e.regions.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))] },
      { key: 'chairperson_name', label: 'Zone Chairperson' },
    ];
    case 'club': return [
      { key: 'name', label: 'Club Name', required: true }, { key: 'club_number', label: 'LCI Club Number' },
      // Parent zone — required for consistency when the district has zones.
      { key: 'zone_id', label: 'Zone (parent)', type: 'select',
        options: [{ value: '', label: '— none —' }, ...e.zones.map((z) => ({ value: z.id, label: `${z.code} — ${z.name}` }))] },
      { key: 'city', label: 'City' }, { key: 'state', label: 'State' },
    ];
    case 'member': return [
      { key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', type: 'select', options: STATUSES.map((s) => ({ value: s, label: s })) },
    ];
  }
}

export function HierarchyEditModal({
  entity, onClose, onSaved,
}: { entity: EditEntity; onClose: () => void; onSaved: () => void }) {
  const fields = fieldsFor(entity);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    for (const { key } of fields) f[key] = String((entity as Record<string, unknown>)[key] ?? '');
    return f;
  });
  // Zone editor: which clubs are assigned to THIS zone (checklist).
  const zoneClubs = entity.type === 'zone' ? entity.clubs ?? [] : [];
  const [assigned, setAssigned] = useState<Set<string>>(
    () => new Set(zoneClubs.filter((c) => c.zone_id === entity.id).map((c) => c.id)),
  );
  const [clubFilter, setClubFilter] = useState('');
  // Club editor: which members are assigned to THIS club (dropdown + list).
  const clubMembers = entity.type === 'club' ? entity.members ?? [] : [];
  const [assignedMembers, setAssignedMembers] = useState<Set<string>>(
    () => new Set(clubMembers.filter((m) => m.club_id === entity.id).map((m) => m.id)),
  );
  const [memberToAdd, setMemberToAdd] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    for (const fld of fields) {
      if (fld.required && !form[fld.key]?.trim()) { setError(`${fld.label} is required.`); return; }
    }
    const payload: Record<string, unknown> = {};
    for (const { key } of fields) payload[key] = form[key]?.trim() ? form[key].trim() : null;

    start(async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(endpointFor(entity), {
          method: 'PATCH', headers, body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { setError(typeof j.error === 'string' ? j.error : `Save failed (${res.status})`); return; }

        // Zone editor: sync club → zone assignments that changed.
        if (entity.type === 'zone' && entity.clubs?.length) {
          const changes: { id: string; zone_id: string | null }[] = [];
          for (const c of entity.clubs) {
            const nowAssigned = assigned.has(c.id);
            const wasThisZone = c.zone_id === entity.id;
            if (nowAssigned && !wasThisZone) changes.push({ id: c.id, zone_id: entity.id });     // assign / move in
            else if (!nowAssigned && wasThisZone) changes.push({ id: c.id, zone_id: null });      // unassign
          }
          const fails: string[] = [];
          for (const ch of changes) {
            const r = await fetch(`/api/crm/clubs/${ch.id}`, {
              method: 'PATCH', headers, body: JSON.stringify({ zone_id: ch.zone_id }),
            });
            if (!r.ok) { const cj = await r.json().catch(() => ({})); fails.push(typeof cj.error === 'string' ? cj.error : `club ${ch.id}`); }
          }
          if (fails.length) { setError(`Zone saved, but ${fails.length} club assignment(s) failed: ${fails[0]}`); return; }
        }

        // Club editor: sync member → club assignments that changed.
        if (entity.type === 'club' && entity.members?.length) {
          const changes: { id: string; club_id: string | null }[] = [];
          for (const m of entity.members) {
            const nowIn = assignedMembers.has(m.id);
            const wasThis = m.club_id === entity.id;
            if (nowIn && !wasThis) changes.push({ id: m.id, club_id: entity.id });   // add / move in
            else if (!nowIn && wasThis) changes.push({ id: m.id, club_id: null });    // remove
          }
          const fails: string[] = [];
          for (const ch of changes) {
            const r = await fetch(`/api/crm/members/${ch.id}`, {
              method: 'PATCH', headers, body: JSON.stringify({ club_id: ch.club_id }),
            });
            if (!r.ok) { const cj = await r.json().catch(() => ({})); fails.push(typeof cj.error === 'string' ? cj.error : `member ${ch.id}`); }
          }
          if (fails.length) { setError(`Club saved, but ${fails.length} member assignment(s) failed: ${fails[0]}`); return; }
        }
        onSaved();
      } catch { setError('Network error while saving.'); }
    });
  }

  const inputCls = 'w-full px-3 py-2 border rounded-md text-sm bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-auto" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-navy-800 capitalize">Edit {TYPE_LABEL[entity.type]}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((fld) => (
            <label key={fld.key} className="block">
              <span className={labelCls}>{fld.label}{fld.required && <span className="text-red-500"> *</span>}</span>
              {fld.type === 'select' ? (
                <select className={inputCls} value={form[fld.key] ?? ''} onChange={(e) => setForm((s) => ({ ...s, [fld.key]: e.target.value }))}>
                  {(fld.options ?? []).map((o) => <option key={o.value} value={o.value} className="capitalize">{o.label}</option>)}
                </select>
              ) : (
                <input className={inputCls} value={form[fld.key] ?? ''} onChange={(e) => setForm((s) => ({ ...s, [fld.key]: e.target.value }))} />
              )}
            </label>
          ))}
        </div>

        {/* Zone editor: assign clubs to this zone. */}
        {entity.type === 'zone' && zoneClubs.length > 0 && (() => {
          const q = clubFilter.trim().toLowerCase();
          const shown = q
            ? zoneClubs.filter((c) => c.name.toLowerCase().includes(q) || (c.club_number ?? '').includes(q))
            : zoneClubs;
          return (
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-500" /> Clubs in this zone
                  <span className="text-gray-400 font-normal">({assigned.size} assigned)</span>
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setAssigned(new Set(zoneClubs.map((c) => c.id)))}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline">Select all</button>
                  <button type="button" onClick={() => setAssigned(new Set())}
                    className="text-[11px] font-semibold text-gray-500 hover:underline">Clear</button>
                </div>
              </div>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} placeholder="Filter clubs…"
                  className="w-full pl-8 pr-3 py-1.5 border rounded-md text-sm bg-white" />
              </div>
              <div className="max-h-56 overflow-auto rounded-md border divide-y">
                {shown.map((c) => {
                  const on = assigned.has(c.id);
                  const elsewhere = !on && c.zone_id != null && c.zone_id !== entity.id;
                  return (
                    <button type="button" key={c.id}
                      onClick={() => setAssigned((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${on ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                      {on ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-gray-400 shrink-0" />}
                      <span className="min-w-0 flex-1 truncate font-medium text-navy-800">{c.name}</span>
                      {c.club_number && <span className="text-[11px] text-gray-400 shrink-0">#{c.club_number}</span>}
                      {elsewhere && <span className="text-[10px] text-amber-600 shrink-0" title="Currently in another zone — assigning moves it here">moves</span>}
                    </button>
                  );
                })}
                {shown.length === 0 && <div className="px-3 py-3 text-xs text-gray-500">No clubs match.</div>}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">Ticking a club assigns it to this zone; a club already in another zone is moved here. Changes save with the zone.</p>
            </div>
          );
        })()}

        {/* Club editor: assign members via a dropdown listing all members. */}
        {entity.type === 'club' && clubMembers.length > 0 && (() => {
          const byId = new Map(clubMembers.map((m) => [m.id, m]));
          const current = [...assignedMembers].map((id) => byId.get(id)).filter(Boolean) as typeof clubMembers;
          const addable = clubMembers
            .filter((m) => !assignedMembers.has(m.id))
            .sort((a, b) => a.name.localeCompare(b.name));
          return (
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5">
                  <Users size={13} className="text-emerald-600" /> Members in this club
                  <span className="text-gray-400 font-normal">({current.length})</span>
                </span>
                {current.length > 0 && (
                  <button type="button" onClick={() => setAssignedMembers(new Set())} className="text-[11px] font-semibold text-gray-500 hover:underline">Remove all</button>
                )}
              </div>

              {/* dropdown: pick any member to add to this club */}
              <select className={inputCls} value={memberToAdd}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) setAssignedMembers((s) => new Set(s).add(id));
                  setMemberToAdd('');
                }}>
                <option value="">+ Add member to this club…</option>
                {addable.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.club_id && m.club_id !== entity.id ? ` — in ${m.club_name ?? 'another club'} (moves)` : m.club_id ? '' : ' — unassigned'}
                  </option>
                ))}
              </select>

              {/* current members with remove */}
              <div className="mt-2 max-h-56 overflow-auto rounded-md border divide-y">
                {current.length === 0 && <div className="px-3 py-3 text-xs text-gray-500">No members assigned yet — add from the dropdown above.</div>}
                {current.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Users size={14} className="text-emerald-600 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-medium text-navy-800">{m.name}</span>
                    {m.club_id && m.club_id !== entity.id && <span className="text-[10px] text-amber-600 shrink-0" title={`Currently in ${m.club_name ?? 'another club'} — moves here on save`}>moves</span>}
                    <button type="button" onClick={() => setAssignedMembers((s) => { const n = new Set(s); n.delete(m.id); return n; })}
                      className="shrink-0 text-gray-400 hover:text-red-600" title="Remove from club" aria-label="Remove from club">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">Adding a member assigns them to this club; a member already in another club is moved here. Changes save with the club.</p>
            </div>
          );
        })()}

        {error && (
          <p className="px-5 pb-2 inline-flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={save} disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold disabled:opacity-60">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
