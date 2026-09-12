'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { EVENT_CATEGORY_GROUPS } from '@/lib/event-categories';
import { createClient } from '@/lib/supabase/client';

export type EventInitial = {
  id: string;
  title: string;
  category: string | null;
  date: string;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  is_public: boolean;
  cover_url: string | null;
  description: string | null;
};

/** ISO timestamp → the local wall-clock value a <input type="datetime-local"> expects. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local wall-clock <input type="datetime-local"> value → ISO 8601, or null when empty. */
function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function EventEditForm({ initial }: { initial: EventInitial }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category ?? '');
  const [date, setDate] = useState(toLocalInputValue(initial.date));
  const [endDate, setEndDate] = useState(toLocalInputValue(initial.end_date));
  const [location, setLocation] = useState(initial.location ?? '');
  const [capacity, setCapacity] = useState(initial.capacity != null ? String(initial.capacity) : '');
  const [isPublic, setIsPublic] = useState(initial.is_public);
  const [coverUrl, setCoverUrl] = useState(initial.cover_url ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError('Title is required'); return; }
    if (!date) { setError('Start date/time is required'); return; }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      category: category || null,
      date: fromLocalInputValue(date),
      end_date: fromLocalInputValue(endDate),
      location: location.trim() || null,
      capacity: capacity ? parseInt(capacity, 10) : null,
      is_public: isPublic,
      cover_url: coverUrl.trim() || null,
      description: description.trim() || null,
    };

    start(async () => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch {
        // No browser session available — fall back to cookie auth.
      }
      const res = await fetch(`/api/events/${initial.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Save failed (${res.status})`);
        return;
      }
      router.push('/admin/events');
      router.refresh();
    });
  }

  const inputCls = 'w-full px-3 py-2 border rounded-md text-sm bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  return (
    <div className="max-w-3xl">
      <Link href="/admin/events" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800 mb-4">
        <ArrowLeft size={14} /> Back to Events
      </Link>

      <h1 className="text-2xl font-bold text-navy-800 mb-1">Edit Event</h1>
      <p className="text-gray-600 mb-6">{initial.title}</p>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border rounded-xl p-5">
        <label className="block md:col-span-2">
          <span className={labelCls}>Title *</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </label>

        <label className="block">
          <span className={labelCls}>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {EVENT_CATEGORY_GROUPS.flatMap((g) =>
              g.items.map((i) => (
                <option key={i.slug} value={i.slug}>{g.title} · {i.label}</option>
              )),
            )}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>Location</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Venue or address" />
        </label>

        <label className="block">
          <span className={labelCls}>Starts At *</span>
          <input required type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>

        <label className="block">
          <span className={labelCls}>Ends At</span>
          <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </label>

        <label className="block">
          <span className={labelCls}>Capacity</span>
          <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} />
        </label>

        <label className="flex items-center gap-2 py-1.5">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span className="text-sm text-gray-700">Public event (visible on website)</span>
        </label>

        <label className="block md:col-span-2">
          <span className={labelCls}>Cover Image URL</span>
          <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className={inputCls} />
        </label>

        <label className="block md:col-span-2">
          <span className={labelCls}>Description</span>
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </label>

        <div className="md:col-span-2 flex items-center gap-3 pt-2 border-t">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold disabled:opacity-60"
          >
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <Link href="/admin/events" className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </Link>
          {error && (
            <span className="inline-flex items-center gap-1.5 text-sm text-red-700">
              <AlertCircle size={14} /> {error}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
