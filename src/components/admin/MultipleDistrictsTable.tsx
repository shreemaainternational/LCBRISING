'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, Loader2, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { RowDeleteButton } from './RowDeleteButton';

export type MdRow = {
  id: string;
  code: string;
  name: string;
  country: string | null;
  council_chairperson_name: string | null;
  constitutional_area_id: string | null;
  district_count: number;
};

type CaOption = { id: string; code: string; name: string };

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* fall back to cookie auth */ }
  return headers;
}

export function MultipleDistrictsTable({ rows, cas = [] }: { rows: MdRow[]; cas?: CaOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<MdRow | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Council Chairperson</th>
            <th className="text-left p-3">Country</th>
            <th className="text-right p-3">Districts</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="p-3 font-mono">{m.code}</td>
              <td className="p-3 font-medium">{m.name}</td>
              <td className="p-3">{m.council_chairperson_name ?? '—'}</td>
              <td className="p-3 text-gray-600">{m.country ?? '—'}</td>
              <td className="p-3 text-right tabular-nums">{m.district_count}</td>
              <td className="p-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                    title="Edit multiple district"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <RowDeleteButton endpoint={`/api/multiple-districts/${m.id}`} label="multiple district" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <EditMdModal
          md={editing}
          cas={cas}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function EditMdModal({ md, cas, onClose, onSaved }: { md: MdRow; cas: CaOption[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: md.name ?? '',
    code: md.code ?? '',
    country: md.country ?? 'India',
    council_chairperson_name: md.council_chairperson_name ?? '',
    constitutional_area_id: md.constitutional_area_id ?? '',
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function save() {
    setError(null);
    if (!form.name.trim()) { setError('Name is required.'); return; }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      country: form.country.trim() || null,
      council_chairperson_name: form.council_chairperson_name.trim() || null,
      constitutional_area_id: form.constitutional_area_id || null,
    };
    start(async () => {
      try {
        const res = await fetch(`/api/multiple-districts/${md.id}`, {
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
      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-navy-800">Edit multiple district</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block md:col-span-2">
            <span className={labelCls}>Name <span className="text-red-500">*</span></span>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Multiple District 323" />
          </label>
          <label className="block">
            <span className={labelCls}>Code</span>
            <input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="323" />
          </label>
          <label className="block">
            <span className={labelCls}>Country</span>
            <input className={inputCls} value={form.country} onChange={(e) => set('country', e.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className={labelCls}>Constitutional Area</span>
            <select className={inputCls} value={form.constitutional_area_id} onChange={(e) => set('constitutional_area_id', e.target.value)}>
              <option value="">— none —</option>
              {cas.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className={labelCls}>Council Chairperson</span>
            <input className={inputCls} value={form.council_chairperson_name} onChange={(e) => set('council_chairperson_name', e.target.value)} />
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
