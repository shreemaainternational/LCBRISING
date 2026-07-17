'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, Loader2, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { RowDeleteButton } from './RowDeleteButton';

export type ZoneRow = {
  id: string;
  code: string;
  name: string;
  chairperson_name: string | null;
  district_id: string;
  district_code: string | null;
  club_count: number;
};

type DistrictOption = { id: string; code: string; name: string };

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* fall back to cookie auth */ }
  return headers;
}

export function ZonesTable({ zones, districts }: { zones: ZoneRow[]; districts: DistrictOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ZoneRow | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">District</th>
            <th className="text-left p-3">Chairperson</th>
            <th className="text-right p-3">Clubs</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id} className="border-t">
              <td className="p-3 font-mono">
                <Link href={`/admin/zones/${z.id}`} className="text-navy-700 hover:underline">{z.code}</Link>
              </td>
              <td className="p-3 font-medium">{z.name}</td>
              <td className="p-3 text-gray-600">{z.district_code ?? '—'}</td>
              <td className="p-3">{z.chairperson_name ?? '—'}</td>
              <td className="p-3 text-right">{z.club_count}</td>
              <td className="p-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(z)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                    title="Edit zone"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <RowDeleteButton endpoint={`/api/zones/${z.id}`} label="zone" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <EditZoneModal
          zone={editing}
          districts={districts}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function EditZoneModal({
  zone, districts, onClose, onSaved,
}: { zone: ZoneRow; districts: DistrictOption[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: zone.name ?? '',
    code: zone.code ?? '',
    district_id: zone.district_id ?? '',
    chairperson_name: zone.chairperson_name ?? '',
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function save() {
    setError(null);
    if (!form.name.trim()) { setError('Zone name is required.'); return; }
    if (!form.district_id) { setError('Pick a district.'); return; }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      district_id: form.district_id,
      chairperson_name: form.chairperson_name.trim() || null,
    };
    start(async () => {
      try {
        const res = await fetch(`/api/zones/${zone.id}`, {
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
          <h3 className="font-semibold text-navy-800">Edit zone</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block md:col-span-2">
            <span className={labelCls}>Zone Name <span className="text-red-500">*</span></span>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Zone B" />
          </label>
          <label className="block">
            <span className={labelCls}>Zone Code</span>
            <input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>District <span className="text-red-500">*</span></span>
            <select className={inputCls} value={form.district_id} onChange={(e) => set('district_id', e.target.value)}>
              <option value="">— pick a district —</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className={labelCls}>Zone Chairperson</span>
            <input className={inputCls} value={form.chairperson_name} onChange={(e) => set('chairperson_name', e.target.value)} />
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
