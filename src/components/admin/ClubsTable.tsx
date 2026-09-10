'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, MapPin, Calendar, Pencil, Trash2, X, Loader2, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export type ClubRow = {
  id: string;
  name: string;
  district: string | null;
  city: string | null;
  state: string | null;
  charter_date: string | null;
  club_number: string | null;
  district_id: string | null;
  region_id?: string | null;
  zone_id?: string | null;
  country?: string | null;
};

type DistrictOption = { id: string; code: string; name: string };
type HierOption = { id: string; code: string; name: string; district_id: string };

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* fall back to cookie auth */ }
  return headers;
}

export function ClubsTable({
  clubs, districts, zones = [], regions = [], memberCounts,
}: {
  clubs: ClubRow[];
  districts: DistrictOption[];
  zones?: HierOption[];
  regions?: HierOption[];
  memberCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ClubRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /** Inline reassign a club to another zone (or none). */
  function moveZone(c: ClubRow, zoneId: string) {
    if ((c.zone_id ?? '') === zoneId) return;
    setError(null);
    setMovingId(c.id);
    start(async () => {
      try {
        const res = await fetch(`/api/crm/clubs/${c.id}`, {
          method: 'PATCH', headers: await authHeaders(), body: JSON.stringify({ zone_id: zoneId || null }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); setError(typeof j.error === 'string' ? j.error : `Move failed (${res.status})`); return; }
        router.refresh();
      } catch { setError('Network error while moving.'); }
      finally { setMovingId(null); }
    });
  }

  function remove(c: ClubRow) {
    if (!window.confirm(`Remove "${c.name}"? A club with members can't be removed until they're moved; this can be restored by an admin.`)) return;
    setError(null);
    setDeletingId(c.id);
    start(async () => {
      try {
        const res = await fetch(`/api/crm/clubs/${c.id}`, { method: 'DELETE', headers: await authHeaders() });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(typeof j.error === 'string' ? j.error : `Delete failed (${res.status})`);
          return;
        }
        router.refresh();
      } catch {
        setError('Network error while deleting.');
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div>
      {error && (
        <p className="mb-3 px-3 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">District</th>
              <th className="text-left p-3">Zone</th>
              <th className="text-left p-3">City</th>
              <th className="text-right p-3">Members</th>
              <th className="text-left p-3">Chartered</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">
                  <Link href={`/admin/clubs/${c.id}`} className="text-navy-800 hover:underline">{c.name}</Link>
                  {c.club_number && <div className="text-xs text-gray-500">LCI #{c.club_number}</div>}
                </td>
                <td className="p-3 text-gray-600">{c.district ?? '—'}</td>
                <td className="p-3">
                  <div className="inline-flex items-center gap-1.5">
                    <select
                      value={c.zone_id ?? ''}
                      onChange={(e) => moveZone(c, e.target.value)}
                      disabled={(pending && movingId === c.id) || !c.district_id}
                      title={c.district_id ? 'Move to another zone' : 'Set a district first'}
                      aria-label="Move club to zone"
                      className="max-w-[9rem] px-2 py-1.5 rounded-md border border-gray-200 text-xs bg-white text-gray-700 disabled:opacity-60"
                    >
                      <option value="">— none —</option>
                      {zones.filter((z) => z.district_id === c.district_id).map((z) => (
                        <option key={z.id} value={z.id}>{z.code} — {z.name}</option>
                      ))}
                    </select>
                    {pending && movingId === c.id && <Loader2 size={13} className="animate-spin text-gray-400" />}
                  </div>
                </td>
                <td className="p-3 text-gray-600">
                  {c.city
                    ? <span className="inline-flex items-center gap-1"><MapPin size={11} />{c.city}{c.state ? `, ${c.state}` : ''}</span>
                    : '—'}
                </td>
                <td className="p-3 text-right">
                  <span className="inline-flex items-center gap-1 text-xs"><Users size={11} />{memberCounts[c.id] ?? 0}</span>
                </td>
                <td className="p-3 text-xs text-gray-600">
                  {c.charter_date ? <span className="inline-flex items-center gap-1"><Calendar size={11} />{new Date(c.charter_date).toLocaleDateString('en-IN')}</span> : '—'}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link href={`/admin/clubs/${c.id}`} className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs text-amber-600 hover:text-amber-800">
                      View →
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setError(null); setEditing(c); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                      title="Edit club"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      disabled={pending && deletingId === c.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 text-xs hover:bg-red-50 disabled:opacity-60"
                      title="Remove club"
                    >
                      {pending && deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditClubModal
          club={editing}
          districts={districts}
          zones={zones}
          regions={regions}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function EditClubModal({
  club, districts, zones, regions, onClose, onSaved,
}: {
  club: ClubRow;
  districts: DistrictOption[];
  zones: HierOption[];
  regions: HierOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: club.name ?? '',
    district_id: club.district_id ?? '',
    region_id: club.region_id ?? '',
    zone_id: club.zone_id ?? '',
    club_number: club.club_number ?? '',
    city: club.city ?? '',
    state: club.state ?? '',
    country: club.country ?? 'India',
    charter_date: club.charter_date ? String(club.charter_date).slice(0, 10) : '',
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function save() {
    setError(null);
    if (!form.name.trim() || form.name.trim().length < 2) { setError('Club name is required (min 2 characters).'); return; }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      district_id: form.district_id || null,
      region_id: form.region_id || null,
      zone_id: form.zone_id || null,
      club_number: form.club_number.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || 'India',
      charter_date: form.charter_date || null,
    };
    start(async () => {
      try {
        const res = await fetch(`/api/crm/clubs/${club.id}`, {
          method: 'PATCH',
          headers: await authHeaders(),
          body: JSON.stringify(payload),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof j.error === 'string' ? j.error : `Save failed (${res.status})`);
          return;
        }
        onSaved();
      } catch {
        setError('Network error while saving.');
      }
    });
  }

  const inputCls = 'w-full px-3 py-2 border rounded-md text-sm bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-navy-800">Edit club</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block md:col-span-2">
            <span className={labelCls}>Club Name <span className="text-red-500">*</span></span>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Lions Club of …" />
          </label>
          <label className="block">
            <span className={labelCls}>District</span>
            <select className={inputCls} value={form.district_id}
              onChange={(e) => setForm((s) => ({ ...s, district_id: e.target.value, region_id: '', zone_id: '' }))}>
              <option value="">—</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Region</span>
            <select className={inputCls} value={form.region_id} onChange={(e) => set('region_id', e.target.value)}
              disabled={!form.district_id}>
              <option value="">— none —</option>
              {regions.filter((r) => r.district_id === form.district_id).map((r) => (
                <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Zone</span>
            <select className={inputCls} value={form.zone_id} onChange={(e) => set('zone_id', e.target.value)}
              disabled={!form.district_id}>
              <option value="">— none —</option>
              {zones.filter((z) => z.district_id === form.district_id).map((z) => (
                <option key={z.id} value={z.id}>{z.code} — {z.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>LCI Club Number</span>
            <input className={inputCls} value={form.club_number} onChange={(e) => set('club_number', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>City</span>
            <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>State</span>
            <input className={inputCls} value={form.state} onChange={(e) => set('state', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Country</span>
            <input className={inputCls} value={form.country} onChange={(e) => set('country', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Charter Date</span>
            <input type="date" className={inputCls} value={form.charter_date} onChange={(e) => set('charter_date', e.target.value)} />
          </label>
        </div>

        {error && (
          <p className="px-5 pb-2 inline-flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
