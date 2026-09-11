'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, Loader2, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { RowDeleteButton } from './RowDeleteButton';
import { formatDate } from '@/lib/utils';
import { EVENT_CATEGORY_GROUPS, getEventCategory } from '@/lib/event-categories';

export type EventRow = {
  id: string;
  title: string;
  category: string | null;
  date: string;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  is_public: boolean;
  description: string | null;
  cover_url: string | null;
};

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* fall back to cookie auth */ }
  return headers;
}

/** Converts an ISO timestamp to the local wall-clock value a
 *  `datetime-local` input expects (YYYY-MM-DDTHH:mm). */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventsTable({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<EventRow | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">Title</th>
            <th className="text-left p-3">Category</th>
            <th className="text-left p-3">When</th>
            <th className="text-left p-3">Location</th>
            <th className="text-right p-3">Capacity</th>
            <th className="text-left p-3">Public</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-3 font-medium">{e.title}</td>
              <td className="p-3">
                {e.category ? getEventCategory(e.category)?.label ?? e.category : '—'}
              </td>
              <td className="p-3">{formatDate(e.date, { hour: '2-digit', minute: '2-digit' })}</td>
              <td className="p-3">{e.location ?? '—'}</td>
              <td className="p-3 text-right">{e.capacity ?? '—'}</td>
              <td className="p-3">{e.is_public ? 'Yes' : 'No'}</td>
              <td className="p-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(e)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                    title="Edit event"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <RowDeleteButton endpoint={`/api/events/${e.id}`} label="event" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <EditEventModal
          event={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function EditEventModal({
  event, onClose, onSaved,
}: { event: EventRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: event.title ?? '',
    category: event.category ?? '',
    date: toLocalInputValue(event.date),
    end_date: toLocalInputValue(event.end_date),
    location: event.location ?? '',
    capacity: event.capacity != null ? String(event.capacity) : '',
    is_public: event.is_public,
    cover_url: event.cover_url ?? '',
    description: event.description ?? '',
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function save() {
    setError(null);
    if (!form.title.trim()) { setError('Event title is required.'); return; }
    if (!form.date) { setError('Start date/time is required.'); return; }
    const payload = {
      title: form.title.trim(),
      category: form.category || null,
      date: new Date(form.date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      location: form.location.trim() || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      is_public: form.is_public,
      cover_url: form.cover_url.trim() || null,
      description: form.description.trim() || null,
    };
    start(async () => {
      try {
        const res = await fetch(`/api/events/${event.id}`, {
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
          <h3 className="font-semibold text-navy-800">Edit event</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block md:col-span-2">
            <span className={labelCls}>Title <span className="text-red-500">*</span></span>
            <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Eye Camp, Installation Night…" />
          </label>
          <label className="block md:col-span-2">
            <span className={labelCls}>Category</span>
            <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">— none —</option>
              {EVENT_CATEGORY_GROUPS.map((g) => (
                <optgroup key={g.key} label={g.title}>
                  {g.items.map((i) => <option key={i.slug} value={i.slug}>{i.label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Starts At <span className="text-red-500">*</span></span>
            <input type="datetime-local" className={inputCls} value={form.date} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Ends At</span>
            <input type="datetime-local" className={inputCls} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className={labelCls}>Location</span>
            <input className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Venue or address" />
          </label>
          <label className="block">
            <span className={labelCls}>Capacity</span>
            <input type="number" min={1} className={inputCls} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={form.is_public} onChange={(e) => set('is_public', e.target.checked)} />
            <span className="text-sm text-gray-700">Public event (visible on website)</span>
          </label>
          <label className="block md:col-span-2">
            <span className={labelCls}>Cover Image URL</span>
            <input className={inputCls} value={form.cover_url} onChange={(e) => set('cover_url', e.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className={labelCls}>Description</span>
            <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
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
