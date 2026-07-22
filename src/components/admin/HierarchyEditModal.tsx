'use client';

import { createContext, useState, useTransition } from 'react';
import { X, Loader2, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/** A node the hierarchy explorer can edit inline. */
export type EditEntity =
  | { type: 'ca'; id: string; name: string; code: string }
  | { type: 'md'; id: string; name: string; code: string; country: string | null; council_chairperson_name: string | null }
  | { type: 'district'; id: string; code: string; name: string; governor_name: string | null; lions_year: string | null }
  | { type: 'region'; id: string; code: string; name: string; chairperson_name: string | null }
  | { type: 'zone'; id: string; code: string; name: string; chairperson_name: string | null }
  | { type: 'club'; id: string; name: string; club_number: string | null; city: string | null; state: string | null }
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

type Field = { key: string; label: string; type?: 'text' | 'select'; options?: string[]; required?: boolean };

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
      { key: 'chairperson_name', label: 'Zone Chairperson' },
    ];
    case 'club': return [
      { key: 'name', label: 'Club Name', required: true }, { key: 'club_number', label: 'LCI Club Number' },
      { key: 'city', label: 'City' }, { key: 'state', label: 'State' },
    ];
    case 'member': return [
      { key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' }, { key: 'status', label: 'Status', type: 'select', options: STATUSES },
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
        const res = await fetch(endpointFor(entity), {
          method: 'PATCH', headers: await authHeaders(), body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { setError(typeof j.error === 'string' ? j.error : `Save failed (${res.status})`); return; }
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
                  {(fld.options ?? []).map((o) => <option key={o} value={o} className="capitalize">{o}</option>)}
                </select>
              ) : (
                <input className={inputCls} value={form[fld.key] ?? ''} onChange={(e) => setForm((s) => ({ ...s, [fld.key]: e.target.value }))} />
              )}
            </label>
          ))}
        </div>

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
