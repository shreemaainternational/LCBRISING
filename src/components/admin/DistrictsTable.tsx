'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, Loader2, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { RowDeleteButton } from './RowDeleteButton';

export type DistrictRow = {
  id: string;
  code: string;
  name: string;
  governor_name: string | null;
  cabinet_secretary_name: string | null;
  cabinet_treasurer_name: string | null;
  lions_year: string | null;
  multiple_district_id?: string | null;
  club_count: number;
};

type MdOption = { id: string; code: string; name: string };

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* fall back to cookie auth */ }
  return headers;
}

export function DistrictsTable({ districts, mds = [] }: { districts: DistrictRow[]; mds?: MdOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DistrictRow | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Governor</th>
            <th className="text-left p-3">Lions year</th>
            <th className="text-right p-3">Clubs</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {districts.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="p-3 font-mono">
                <Link href={`/admin/districts/${d.id}`} className="text-navy-700 hover:underline">{d.code}</Link>
              </td>
              <td className="p-3 font-medium">{d.name}</td>
              <td className="p-3">{d.governor_name ?? '—'}</td>
              <td className="p-3 text-gray-500">{d.lions_year ?? '—'}</td>
              <td className="p-3 text-right tabular-nums">{d.club_count}</td>
              <td className="p-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(d)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                    title="Edit district"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <RowDeleteButton endpoint={`/api/crm/districts/${d.id}`} label="district" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <EditDistrictModal
          district={editing}
          mds={mds}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function EditDistrictModal({
  district, mds, onClose, onSaved,
}: { district: DistrictRow; mds: MdOption[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: district.code ?? '',
    name: district.name ?? '',
    multiple_district_id: district.multiple_district_id ?? '',
    governor_name: district.governor_name ?? '',
    cabinet_secretary_name: district.cabinet_secretary_name ?? '',
    cabinet_treasurer_name: district.cabinet_treasurer_name ?? '',
    lions_year: district.lions_year ?? '',
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function save() {
    setError(null);
    if (form.code.trim().length < 2) { setError('District code is required.'); return; }
    if (form.name.trim().length < 2) { setError('District name is required.'); return; }
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      multiple_district_id: form.multiple_district_id || null,
      governor_name: form.governor_name.trim() || null,
      cabinet_secretary_name: form.cabinet_secretary_name.trim() || null,
      cabinet_treasurer_name: form.cabinet_treasurer_name.trim() || null,
      lions_year: form.lions_year.trim() || null,
    };
    start(async () => {
      try {
        const res = await fetch(`/api/crm/districts/${district.id}`, {
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
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-navy-800">Edit district</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>District Code <span className="text-red-500">*</span></span>
            <input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="e.g. 3232 F1" />
          </label>
          <label className="block">
            <span className={labelCls}>District Name <span className="text-red-500">*</span></span>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Multiple District</span>
            <select className={inputCls} value={form.multiple_district_id} onChange={(e) => set('multiple_district_id', e.target.value)}>
              <option value="">— none —</option>
              {mds.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Governor</span>
            <input className={inputCls} value={form.governor_name} onChange={(e) => set('governor_name', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Lions Year</span>
            <input className={inputCls} value={form.lions_year} onChange={(e) => set('lions_year', e.target.value)} placeholder="2025-26" />
          </label>
          <label className="block">
            <span className={labelCls}>Cabinet Secretary</span>
            <input className={inputCls} value={form.cabinet_secretary_name} onChange={(e) => set('cabinet_secretary_name', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Cabinet Treasurer</span>
            <input className={inputCls} value={form.cabinet_treasurer_name} onChange={(e) => set('cabinet_treasurer_name', e.target.value)} />
          </label>
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
