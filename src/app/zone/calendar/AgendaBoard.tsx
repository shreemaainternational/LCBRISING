'use client';
import { useState, useTransition } from 'react';
import {
  Plus, Save, X, Loader2, Pin, PinOff, Trash2, Calendar, MapPin,
  CheckCircle2, CircleDot, CircleSlash,
} from 'lucide-react';

export type AgendaStatus = 'planned' | 'in_progress' | 'done' | 'cancelled';

export interface AgendaItem {
  id: string;
  title: string;
  notes: string | null;
  scheduled_at: string | null;
  location: string | null;
  status: AgendaStatus;
  is_pinned: boolean;
  display_order: number;
  owner?: { name?: string } | null;
}

interface Props { initialItems: AgendaItem[]; }

const STATUS_META: Record<AgendaStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
  planned:     { label: 'Planned',    color: 'bg-blue-100 text-blue-700',      icon: CircleDot },
  in_progress: { label: 'In progress',color: 'bg-amber-100 text-amber-800',    icon: CircleDot },
  done:        { label: 'Done',       color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  cancelled:   { label: 'Cancelled',  color: 'bg-gray-100 text-gray-500',      icon: CircleSlash },
};

const STATUS_ORDER: AgendaStatus[] = ['planned', 'in_progress', 'done', 'cancelled'];

export function AgendaBoard({ initialItems }: Props) {
  const [items, setItems] = useState<AgendaItem[]>(initialItems);
  const [pending, start] = useTransition();
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    title: '', notes: '', scheduled_at: '', location: '', status: 'planned' as AgendaStatus, is_pinned: false,
  });

  function resetDraft() {
    setDraft({ title: '', notes: '', scheduled_at: '', location: '', status: 'planned', is_pinned: false });
  }

  async function create() {
    if (!draft.title.trim()) return;
    start(async () => {
      const res = await fetch('/api/zone/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          notes: draft.notes || undefined,
          scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : null,
          location: draft.location || undefined,
          status: draft.status,
          is_pinned: draft.is_pinned,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.item) {
        setItems((cur) => sort([...cur, j.item as AgendaItem]));
        resetDraft();
        setComposing(false);
      }
    });
  }

  async function patch(id: string, body: Partial<AgendaItem>) {
    setItems((cur) => cur.map((it) => it.id === id ? { ...it, ...body } as AgendaItem : it));
    start(async () => {
      await fetch(`/api/zone/agenda/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });
  }

  async function destroy(id: string) {
    if (!confirm('Delete this agenda item?')) return;
    setItems((cur) => cur.filter((it) => it.id !== id));
    start(async () => {
      await fetch(`/api/zone/agenda/${id}`, { method: 'DELETE' });
    });
  }

  function sort(arr: AgendaItem[]): AgendaItem[] {
    return [...arr].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      const aT = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
      const bT = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
      return aT - bT;
    });
  }

  // Group by status for kanban view
  const grouped: Record<AgendaStatus, AgendaItem[]> = { planned: [], in_progress: [], done: [], cancelled: [] };
  for (const it of items) grouped[it.status].push(it);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {items.length} item{items.length === 1 ? '' : 's'} · {items.filter((i) => i.is_pinned).length} pinned
        </p>
        {!composing && (
          <button type="button" onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold">
            <Plus size={14} /> Add agenda item
          </button>
        )}
      </div>

      {composing && (
        <div className="bg-white border-2 border-amber-300 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-navy-800">New agenda item</h4>
            <button type="button" onClick={() => { setComposing(false); resetDraft(); }}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Title *" className="md:col-span-2">
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className={cls} placeholder="Zone Cabinet Meeting · Eye Camp Planning · …" />
            </Field>
            <Field label="Scheduled at">
              <input type="datetime-local" value={draft.scheduled_at}
                onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })}
                className={cls} />
            </Field>
            <Field label="Location">
              <input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                className={cls} placeholder="Hall, address or Zoom link" />
            </Field>
            <Field label="Status">
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as AgendaStatus })}
                className={cls}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </Field>
            <Field label="Pin to top">
              <label className="inline-flex items-center gap-2 mt-2">
                <input type="checkbox" checked={draft.is_pinned}
                  onChange={(e) => setDraft({ ...draft, is_pinned: e.target.checked })} />
                <span className="text-sm text-gray-700">Pinned</span>
              </label>
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className={cls} placeholder="Discussion notes, agenda points, attendees…" />
            </Field>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <button type="button" onClick={create} disabled={pending || !draft.title.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
              {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Save
            </button>
            <button type="button" onClick={() => { setComposing(false); resetDraft(); }}
              className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="bg-gray-50 rounded-xl border p-3 min-h-[180px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <h4 className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_META[s].color}`}>
                {STATUS_META[s].label}
              </h4>
              <span className="text-xs font-semibold text-gray-500">{grouped[s].length}</span>
            </div>
            <div className="space-y-2">
              {grouped[s].length === 0 && (
                <p className="text-xs text-gray-400 italic px-1">No items</p>
              )}
              {grouped[s].map((it) => (
                <AgendaCard
                  key={it.id}
                  item={it}
                  editing={editingId === it.id}
                  pending={pending}
                  onStartEdit={() => setEditingId(it.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(body) => { patch(it.id, body); setEditingId(null); }}
                  onTogglePin={() => patch(it.id, { is_pinned: !it.is_pinned })}
                  onChangeStatus={(status) => patch(it.id, { status })}
                  onDelete={() => destroy(it.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaCard({ item, editing, pending, onStartEdit, onCancelEdit, onSave, onTogglePin, onChangeStatus, onDelete }: {
  item: AgendaItem; editing: boolean; pending: boolean;
  onStartEdit: () => void; onCancelEdit: () => void;
  onSave: (body: Partial<AgendaItem>) => void;
  onTogglePin: () => void;
  onChangeStatus: (s: AgendaStatus) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState({
    title: item.title, notes: item.notes ?? '',
    scheduled_at: item.scheduled_at ? toLocal(item.scheduled_at) : '',
    location: item.location ?? '',
  });

  if (editing) {
    return (
      <div className="bg-white border-2 border-amber-300 rounded-lg p-3 shadow-sm space-y-2">
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="w-full text-sm font-semibold border rounded px-2 py-1.5" placeholder="Title" />
        <div className="grid grid-cols-1 gap-2">
          <input type="datetime-local" value={draft.scheduled_at}
            onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value })}
            className="w-full text-xs border rounded px-2 py-1.5" />
          <input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            className="w-full text-xs border rounded px-2 py-1.5" placeholder="Location" />
          <textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            className="w-full text-xs border rounded px-2 py-1.5" placeholder="Notes" />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onSave({
            title: draft.title,
            notes: draft.notes || null,
            scheduled_at: draft.scheduled_at ? new Date(draft.scheduled_at).toISOString() : null,
            location: draft.location || null,
          })} disabled={pending || !draft.title.trim()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-60">
            {pending ? <Loader2 className="animate-spin" size={11} /> : <Save size={11} />} Save
          </button>
          <button type="button" onClick={onCancelEdit}
            className="px-2 py-1 rounded border text-xs text-gray-600">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group bg-white border rounded-lg p-3 shadow-sm hover:shadow transition-shadow ${item.is_pinned ? 'border-amber-400' : ''}`}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <button type="button" onClick={onStartEdit} className="text-left flex-1 min-w-0">
          <div className="font-semibold text-sm text-navy-800 break-words">{item.title}</div>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={onTogglePin} title={item.is_pinned ? 'Unpin' : 'Pin'}
            className={`w-6 h-6 rounded flex items-center justify-center ${item.is_pinned ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100 text-gray-500'}`}>
            {item.is_pinned ? <Pin size={11} /> : <PinOff size={11} />}
          </button>
          <button type="button" onClick={onDelete} title="Delete"
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-rose-100 text-rose-500">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {(item.scheduled_at || item.location) && (
        <div className="text-[11px] text-gray-600 space-y-0.5 mb-1.5">
          {item.scheduled_at && (
            <div className="inline-flex items-center gap-1">
              <Calendar size={10} /> {new Date(item.scheduled_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {item.location && (
            <div className="inline-flex items-center gap-1">
              <MapPin size={10} /> {item.location}
            </div>
          )}
        </div>
      )}

      {item.notes && (
        <p className="text-xs text-gray-600 leading-snug line-clamp-3 mb-2">{item.notes}</p>
      )}

      <select value={item.status} onChange={(e) => onChangeStatus(e.target.value as AgendaStatus)}
        className="w-full text-[11px] px-2 py-1 rounded border bg-gray-50">
        {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
      </select>
    </div>
  );
}

function toLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const cls = 'w-full px-3 py-2 border rounded-md text-sm';
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
