'use client';

import { createContext, useState, useTransition } from 'react';
import { X, Loader2, Plus, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/** Describes a child to create under a given parent node. */
export type CreateSpec =
  | { childType: 'md'; parentLabel: string; constitutional_area_id: string }
  | { childType: 'district'; parentLabel: string; multiple_district_id: string }
  | { childType: 'region'; parentLabel: string; district_id: string }
  | { childType: 'zone'; parentLabel: string; district_id: string; region_id: string }
  | { childType: 'club'; parentLabel: string; district_id: string; zone_id: string };

/** Provided by the explorer; opens the create modal for a parent node. */
export const HierarchyCreateContext = createContext<(c: CreateSpec) => void>(() => {});

const CHILD_LABEL: Record<CreateSpec['childType'], string> = {
  md: 'Multiple District', district: 'District', region: 'Region', zone: 'Zone', club: 'Club',
};

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* fall back to cookie auth */ }
  return headers;
}

type Field = { key: string; label: string; required?: boolean; placeholder?: string };

function fieldsFor(t: CreateSpec['childType']): Field[] {
  switch (t) {
    case 'md': return [
      { key: 'name', label: 'Multiple District Name', required: true, placeholder: 'e.g. Multiple District 323' },
      { key: 'code', label: 'Code', placeholder: 'e.g. 323' },
      { key: 'country', label: 'Country' },
      { key: 'council_chairperson_name', label: 'Council Chairperson' },
    ];
    case 'district': return [
      { key: 'code', label: 'District Code', required: true, placeholder: 'e.g. 3232 F1' },
      { key: 'name', label: 'District Name', required: true },
      { key: 'governor_name', label: 'Governor' },
      { key: 'lions_year', label: 'Lions Year', placeholder: '2026-27' },
    ];
    case 'region': return [
      { key: 'name', label: 'Region Name', required: true, placeholder: 'e.g. Region 1' },
      { key: 'code', label: 'Code' },
      { key: 'chairperson_name', label: 'Region Chairperson' },
    ];
    case 'zone': return [
      { key: 'name', label: 'Zone Name', required: true, placeholder: 'e.g. Region 1 Zone 1' },
      { key: 'code', label: 'Code' },
      { key: 'chairperson_name', label: 'Zone Chairperson' },
    ];
    case 'club': return [
      { key: 'name', label: 'Club Name', required: true, placeholder: 'Lions Club of …' },
      { key: 'club_number', label: 'LCI Club Number' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
    ];
  }
}

function endpointFor(t: CreateSpec['childType']): string {
  switch (t) {
    case 'md': return '/api/multiple-districts';
    case 'district': return '/api/crm/districts';
    case 'region': return '/api/regions';
    case 'zone': return '/api/zones';
    case 'club': return '/api/crm/clubs';
  }
}

/** Parent ids to merge into the POST body. */
function parentPayload(spec: CreateSpec): Record<string, unknown> {
  switch (spec.childType) {
    case 'md': return { constitutional_area_id: spec.constitutional_area_id };
    case 'district': return { multiple_district_id: spec.multiple_district_id };
    case 'region': return { district_id: spec.district_id };
    case 'zone': return { district_id: spec.district_id, region_id: spec.region_id };
    case 'club': return { district_id: spec.district_id, zone_id: spec.zone_id };
  }
}

export function HierarchyCreateModal({
  spec, onClose, onCreated,
}: { spec: CreateSpec; onClose: () => void; onCreated: () => void }) {
  const fields = fieldsFor(spec.childType);
  const [form, setForm] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    for (const fld of fields) {
      if (fld.required && !form[fld.key]?.trim()) { setError(`${fld.label} is required.`); return; }
    }
    const payload: Record<string, unknown> = { ...parentPayload(spec) };
    for (const { key } of fields) if (form[key]?.trim()) payload[key] = form[key].trim();

    start(async () => {
      try {
        const res = await fetch(endpointFor(spec.childType), {
          method: 'POST', headers: await authHeaders(), body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { setError(typeof j.error === 'string' ? j.error : `Create failed (${res.status})`); return; }
        onCreated();
      } catch { setError('Network error while creating.'); }
    });
  }

  const inputCls = 'w-full px-3 py-2 border rounded-md text-sm bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-auto" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-navy-800">
            Add {CHILD_LABEL[spec.childType]} <span className="text-gray-400 font-normal">under {spec.parentLabel}</span>
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((fld) => (
            <label key={fld.key} className="block">
              <span className={labelCls}>{fld.label}{fld.required && <span className="text-red-500"> *</span>}</span>
              <input className={inputCls} placeholder={fld.placeholder} value={form[fld.key] ?? ''}
                onChange={(e) => setForm((s) => ({ ...s, [fld.key]: e.target.value }))} />
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
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {pending ? 'Creating…' : `Add ${CHILD_LABEL[spec.childType]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
