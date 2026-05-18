'use client';
import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Save, X, Loader2, Trash2, Pencil, Calendar, MapPin, Megaphone,
} from 'lucide-react';
import {
  CATEGORY_META, SCOPE_META,
  type LionsEventCategory, type LionsEventScope,
} from '@/lib/lions-calendar-meta';

export interface LionsEventRow {
  id: string;
  lions_year: string;
  title: string;
  category: LionsEventCategory;
  scope: LionsEventScope;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  description: string | null;
  host_name: string | null;
  announced_by: string | null;
  source_url: string | null;
  rsvp_required: boolean;
  color: string | null;
  tags: string[];
}

interface Props {
  currentYear: string;
  initialEvents: LionsEventRow[];
}

const CATEGORIES = Object.keys(CATEGORY_META) as LionsEventCategory[];
const SCOPES = Object.keys(SCOPE_META) as LionsEventScope[];

const empty = (year: string): Partial<LionsEventRow> => ({
  lions_year: year,
  title: '',
  category: 'other',
  scope: 'zone',
  starts_at: new Date().toISOString(),
  ends_at: null,
  all_day: true,
  location: '',
  description: '',
  host_name: '',
  announced_by: '',
  source_url: '',
  rsvp_required: false,
  tags: [],
});

export function LionsYearCalendar({ currentYear, initialEvents }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<LionsEventRow[]>(initialEvents);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<LionsEventCategory | ''>('');
  const [filterScope, setFilterScope] = useState<LionsEventScope | ''>('');
  const [pending, start] = useTransition();

  const grouped = useMemo(() => {
    const filtered = events.filter((e) =>
      (!filterCategory || e.category === filterCategory) &&
      (!filterScope || e.scope === filterScope),
    );
    const byMonth = new Map<string, LionsEventRow[]>();
    for (const e of filtered) {
      const d = new Date(e.starts_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const arr = byMonth.get(key) ?? [];
      arr.push(e);
      byMonth.set(key, arr);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events, filterCategory, filterScope]);

  async function create(draft: Partial<LionsEventRow>) {
    start(async () => {
      const res = await fetch('/api/zone/lions-calendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.event) {
        setEvents((cur) => [...cur, j.event].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
        setComposing(false);
      }
    });
  }
  async function patch(id: string, body: Partial<LionsEventRow>) {
    setEvents((cur) => cur.map((e) => e.id === id ? { ...e, ...body } : e));
    start(async () => {
      await fetch(`/api/zone/lions-calendar/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });
  }
  async function destroy(id: string) {
    if (!confirm('Remove this event?')) return;
    setEvents((cur) => cur.filter((e) => e.id !== id));
    start(async () => { await fetch(`/api/zone/lions-calendar/${id}`, { method: 'DELETE' }); });
  }

  function changeYear(y: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('year', y);
    router.push(url.pathname + '?' + url.searchParams.toString());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border shadow-sm p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Year</label>
          <input value={currentYear} onChange={(e) => changeYear(e.target.value)}
            className="px-2 py-1 border rounded text-sm font-mono w-28" />
          <span className="hidden md:inline-block text-gray-300">·</span>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as LionsEventCategory | '')}
            className="px-2 py-1 border rounded text-sm">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>)}
          </select>
          <select value={filterScope} onChange={(e) => setFilterScope(e.target.value as LionsEventScope | '')}
            className="px-2 py-1 border rounded text-sm">
            <option value="">All scopes</option>
            {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_META[s].label}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => setComposing(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold">
          <Plus size={14} /> Add event
        </button>
      </div>

      {composing && (
        <EventEditor
          initial={empty(currentYear)}
          onCancel={() => setComposing(false)}
          onSave={create}
          submitLabel="Add to Lions Year"
          pending={pending}
        />
      )}

      <div className="space-y-5">
        {grouped.length === 0 && !composing && (
          <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
            No events in this Lions Year yet. Click <strong>Add event</strong> to start.
          </div>
        )}
        {grouped.map(([month, rows]) => {
          const d = new Date(`${month}-01T00:00:00`);
          const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
          return (
            <div key={month}>
              <h3 className="text-sm font-bold text-navy-800 mb-2 px-1 inline-flex items-center gap-2">
                <Calendar size={14} className="text-amber-500" /> {label}
                <span className="text-xs font-normal text-gray-500">· {rows.length} event{rows.length === 1 ? '' : 's'}</span>
              </h3>
              <div className="space-y-2">
                {rows.map((e) => editingId === e.id ? (
                  <EventEditor
                    key={e.id}
                    initial={e}
                    onCancel={() => setEditingId(null)}
                    onSave={(body) => { patch(e.id, body as Partial<LionsEventRow>); setEditingId(null); }}
                    submitLabel="Save changes"
                    pending={pending}
                  />
                ) : (
                  <EventRow
                    key={e.id}
                    e={e}
                    onEdit={() => setEditingId(e.id)}
                    onDelete={() => destroy(e.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventRow({ e, onEdit, onDelete }: {
  e: LionsEventRow; onEdit: () => void; onDelete: () => void;
}) {
  const meta = CATEGORY_META[e.category];
  const start = new Date(e.starts_at);
  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 group hover:shadow transition-shadow">
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-white font-bold"
          style={{ backgroundColor: e.color || meta.color }}
        >
          <div className="text-[10px] uppercase tracking-wider opacity-80">
            {start.toLocaleString('en-IN', { month: 'short' })}
          </div>
          <div className="text-lg leading-none">{start.getDate()}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">{meta.emoji}</span>
            <h4 className="font-semibold text-navy-800">{e.title}</h4>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {SCOPE_META[e.scope].label}
            </span>
            {e.rsvp_required && (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                RSVP
              </span>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {e.all_day
                ? start.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
                : start.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {e.ends_at && <> – {new Date(e.ends_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>}
            </span>
            {e.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {e.location}</span>}
            {e.announced_by && <span className="inline-flex items-center gap-1"><Megaphone size={11} /> {e.announced_by}</span>}
            {e.host_name && <span>· Host: {e.host_name}</span>}
          </div>
          {e.description && <p className="text-sm text-gray-700 mt-2 leading-snug">{e.description}</p>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={onEdit}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 text-gray-600">
            <Pencil size={12} />
          </button>
          <button type="button" onClick={onDelete}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-rose-100 text-rose-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EventEditor({ initial, onCancel, onSave, submitLabel, pending }: {
  initial: Partial<LionsEventRow>;
  onCancel: () => void;
  onSave: (e: Partial<LionsEventRow>) => void;
  submitLabel: string;
  pending: boolean;
}) {
  const [d, setD] = useState<Partial<LionsEventRow>>(initial);

  function save() {
    if (!d.title?.trim() || !d.starts_at) return;
    onSave({
      ...d,
      starts_at: new Date(d.starts_at).toISOString(),
      ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
    });
  }

  return (
    <div className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-navy-800">{initial.id ? 'Edit event' : 'New event'}</h4>
        <button type="button" onClick={onCancel}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Title *" full>
          <input value={d.title ?? ''} onChange={(e) => setD({ ...d, title: e.target.value })}
            className={cls} placeholder="DG Visit · Vision Week · MD Conference · …" />
        </Field>
        <Field label="Category *">
          <select value={d.category ?? 'other'} onChange={(e) => setD({ ...d, category: e.target.value as LionsEventCategory })}
            className={cls}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>)}
          </select>
        </Field>
        <Field label="Scope *">
          <select value={d.scope ?? 'zone'} onChange={(e) => setD({ ...d, scope: e.target.value as LionsEventScope })}
            className={cls}>
            {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_META[s].label}</option>)}
          </select>
        </Field>
        <Field label="Starts at *">
          <input type={d.all_day ? 'date' : 'datetime-local'}
            value={fmt(d.starts_at, d.all_day)}
            onChange={(e) => setD({ ...d, starts_at: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })}
            className={cls} />
        </Field>
        <Field label="Ends at">
          <input type={d.all_day ? 'date' : 'datetime-local'}
            value={d.ends_at ? fmt(d.ends_at, d.all_day) : ''}
            onChange={(e) => setD({ ...d, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className={cls} />
        </Field>
        <Field label="Location">
          <input value={d.location ?? ''} onChange={(e) => setD({ ...d, location: e.target.value })}
            className={cls} placeholder="Hall / address / Zoom" />
        </Field>
        <Field label="Host name">
          <input value={d.host_name ?? ''} onChange={(e) => setD({ ...d, host_name: e.target.value })}
            className={cls} placeholder="Hosted by" />
        </Field>
        <Field label="Announced by">
          <input value={d.announced_by ?? ''} onChange={(e) => setD({ ...d, announced_by: e.target.value })}
            className={cls} placeholder="DG MJF Lion …" />
        </Field>
        <Field label="Reference URL">
          <input value={d.source_url ?? ''} onChange={(e) => setD({ ...d, source_url: e.target.value })}
            className={cls} placeholder="https://…" />
        </Field>
        <Field label="All-day event">
          <label className="inline-flex items-center gap-2 mt-2">
            <input type="checkbox" checked={!!d.all_day} onChange={(e) => setD({ ...d, all_day: e.target.checked })} />
            <span className="text-sm text-gray-700">All-day</span>
          </label>
        </Field>
        <Field label="RSVP required">
          <label className="inline-flex items-center gap-2 mt-2">
            <input type="checkbox" checked={!!d.rsvp_required} onChange={(e) => setD({ ...d, rsvp_required: e.target.checked })} />
            <span className="text-sm text-gray-700">Requires RSVP</span>
          </label>
        </Field>
        <Field label="Description" full>
          <textarea rows={3} value={d.description ?? ''} onChange={(e) => setD({ ...d, description: e.target.value })}
            className={cls} placeholder="What is this event about?" />
        </Field>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
        <button type="button" onClick={save} disabled={pending || !d.title?.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

function fmt(iso: string | null | undefined, allDay: boolean | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (allDay) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const cls = 'w-full px-3 py-2 border rounded-md text-sm';
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
