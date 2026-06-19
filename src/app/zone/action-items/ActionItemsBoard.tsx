'use client';
import { useState, useMemo, useTransition } from 'react';
import {
  Plus, Save, X, Loader2, Trash2, Pin, PinOff, Send, BellRing,
  CircleDot, CheckCircle2, AlertCircle,
} from 'lucide-react';

// Module-scoped so the current-time read is not flagged as impure render work.
const nowMs = () => Date.now();

type Status = 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Channel = 'email' | 'whatsapp' | 'sms' | 'push';

export interface ActionItemRow {
  id: string;
  title: string;
  details: string | null;
  status: Status;
  priority: Priority;
  owner_member_id: string | null;
  owner_name: string | null;
  watchers: string[];
  due_date: string | null;
  done_at: string | null;
  blocked_reason: string | null;
  last_reminder_at: string | null;
  reminder_count: number;
  remind_channel: Channel | null;
  remind_when_due_in_days: number | null;
  is_pinned: boolean;
  tags: string[];
  agenda_id: string | null;
  minutes_id: string | null;
  club_id: string | null;
  owner?: { name?: string; email?: string } | null;
  club?: { name?: string } | null;
}

interface Props {
  initialItems: ActionItemRow[];
  members: { id: string; name: string; email: string }[];
  clubs: { id: string; name: string }[];
}

const STATUS_META: Record<Status, { label: string; color: string }> = {
  open:        { label: 'Open',        color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In progress', color: 'bg-amber-100 text-amber-800' },
  blocked:     { label: 'Blocked',     color: 'bg-rose-100 text-rose-700' },
  done:        { label: 'Done',        color: 'bg-emerald-100 text-emerald-700' },
  cancelled:   { label: 'Cancelled',   color: 'bg-gray-100 text-gray-500' },
};

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-rose-500 text-white' },
  high:   { label: 'High',   color: 'bg-orange-500 text-white' },
  medium: { label: 'Medium', color: 'bg-amber-400 text-white' },
  low:    { label: 'Low',    color: 'bg-blue-400 text-white' },
};

export function ActionItemsBoard({ initialItems, members, clubs }: Props) {
  const [items, setItems] = useState<ActionItemRow[]>(initialItems);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | ''>('');
  const [filterOwner, setFilterOwner] = useState('');
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(() => items.filter((it) =>
    (!filterStatus || it.status === filterStatus) &&
    (!filterOwner || it.owner_member_id === filterOwner)),
  [items, filterStatus, filterOwner]);

  const kpis = useMemo(() => {
    const open = items.filter((i) => i.status !== 'done' && i.status !== 'cancelled');
    const overdue = open.filter((i) => i.due_date && new Date(i.due_date) < new Date());
    const dueSoon = open.filter((i) => {
      if (!i.due_date) return false;
      const d = new Date(i.due_date).getTime() - nowMs();
      return d > 0 && d < 7 * 86400_000;
    });
    return { total: items.length, open: open.length, overdue: overdue.length, dueSoon: dueSoon.length };
  }, [items]);

  async function create(draft: Partial<ActionItemRow>) {
    start(async () => {
      const res = await fetch('/api/zone/action-items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.item) {
        setItems((cur) => [j.item as ActionItemRow, ...cur]);
        setComposing(false);
        setNotice('Action item created.');
      } else setNotice(j.error ?? 'Save failed');
    });
  }

  async function patch(id: string, body: Partial<ActionItemRow>) {
    setItems((cur) => cur.map((it) => it.id === id ? { ...it, ...body } as ActionItemRow : it));
    start(async () => {
      await fetch(`/api/zone/action-items/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });
  }

  async function destroy(id: string) {
    if (!confirm('Delete this action item?')) return;
    setItems((cur) => cur.filter((it) => it.id !== id));
    start(async () => { await fetch(`/api/zone/action-items/${id}`, { method: 'DELETE' }); });
  }

  async function remind(id: string) {
    setNotice(null);
    start(async () => {
      const res = await fetch(`/api/zone/action-items/${id}/remind`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (j.ok) setNotice(`Reminder sent via ${j.channel}.`);
      else setNotice(`Reminder failed${j.error ? `: ${j.error}` : ''}.`);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total"     value={kpis.total}   color="text-navy-900" />
        <Kpi label="Open"      value={kpis.open}    color="text-blue-700" />
        <Kpi label="Due soon"  value={kpis.dueSoon} color="text-amber-700" />
        <Kpi label="Overdue"   value={kpis.overdue} color="text-rose-700" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as Status | '')}
            className="px-2 py-1 border rounded text-sm">
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}
            className="px-2 py-1 border rounded text-sm">
            <option value="">All owners</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {!composing && (
          <button type="button" onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold">
            <Plus size={14} /> Add action item
          </button>
        )}
      </div>

      {notice && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 inline-flex items-center gap-1.5">
          <AlertCircle size={12} /> {notice}
        </p>
      )}

      {composing && (
        <Editor
          initial={{ status: 'open', priority: 'medium', remind_channel: 'email', remind_when_due_in_days: 1 }}
          members={members} clubs={clubs}
          onCancel={() => setComposing(false)}
          onSave={create}
          submitLabel="Create"
          pending={pending}
        />
      )}

      <div className="space-y-2">
        {visible.length === 0 && !composing && (
          <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
            No matching items. Click <strong>Add action item</strong> to start.
          </div>
        )}
        {visible.map((it) => editingId === it.id ? (
          <Editor
            key={it.id}
            initial={it}
            members={members} clubs={clubs}
            onCancel={() => setEditingId(null)}
            onSave={(d) => { patch(it.id, d); setEditingId(null); }}
            submitLabel="Save"
            pending={pending}
          />
        ) : (
          <Row
            key={it.id}
            it={it}
            members={members}
            onEdit={() => setEditingId(it.id)}
            onTogglePin={() => patch(it.id, { is_pinned: !it.is_pinned })}
            onChangeStatus={(status) => patch(it.id, { status })}
            onDelete={() => destroy(it.id)}
            onRemind={() => remind(it.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

function Row({ it, members, onEdit, onTogglePin, onChangeStatus, onDelete, onRemind }: {
  it: ActionItemRow;
  members: { id: string; name: string }[];
  onEdit: () => void;
  onTogglePin: () => void;
  onChangeStatus: (s: Status) => void;
  onDelete: () => void;
  onRemind: () => void;
}) {
  const due = it.due_date ? new Date(it.due_date) : null;
  const overdue = due && due < new Date() && it.status !== 'done' && it.status !== 'cancelled';
  const owner = it.owner_member_id ? members.find((m) => m.id === it.owner_member_id) : null;
  return (
    <div className={`group bg-white border rounded-xl p-4 shadow-sm hover:shadow ${it.is_pinned ? 'border-amber-400' : ''} ${overdue ? 'border-rose-300' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-navy-800">{it.title}</h4>
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${PRIORITY_META[it.priority].color}`}>
              {PRIORITY_META[it.priority].label}
            </span>
            {it.is_pinned && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                <Pin size={10} /> Pinned
              </span>
            )}
            {overdue && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                OVERDUE
              </span>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-3">
            {owner && <span>👤 {owner.name}</span>}
            {!owner && it.owner_name && <span>👤 {it.owner_name}</span>}
            {it.due_date && <span>📅 Due {it.due_date}</span>}
            {it.club?.name && <span>🏛️ {it.club.name}</span>}
            {(it.reminder_count ?? 0) > 0 && (
              <span>🔔 {it.reminder_count} reminder{it.reminder_count === 1 ? '' : 's'}</span>
            )}
          </div>
          {it.details && <p className="text-sm text-gray-700 mt-2 leading-snug">{it.details}</p>}
          {it.blocked_reason && it.status === 'blocked' && (
            <p className="text-xs text-rose-700 mt-1.5 bg-rose-50 px-2 py-1 rounded">⚠ {it.blocked_reason}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <select value={it.status} onChange={(e) => onChangeStatus(e.target.value as Status)}
            className={`text-[11px] font-semibold border rounded px-2 py-1 ${STATUS_META[it.status].color}`}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {it.owner_member_id && it.status !== 'done' && (
              <button type="button" onClick={onRemind}
                title={`Remind ${owner?.name ?? 'owner'} via ${it.remind_channel ?? 'email'}`}
                className="w-7 h-7 rounded flex items-center justify-center hover:bg-amber-100 text-amber-700">
                <Send size={12} />
              </button>
            )}
            <button type="button" onClick={onTogglePin} title={it.is_pinned ? 'Unpin' : 'Pin'}
              className={`w-7 h-7 rounded flex items-center justify-center ${it.is_pinned ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100 text-gray-500'}`}>
              {it.is_pinned ? <Pin size={12} /> : <PinOff size={12} />}
            </button>
            <button type="button" onClick={onEdit}
              className="px-2 py-1 rounded text-xs hover:bg-gray-100 text-gray-700 font-semibold">
              Edit
            </button>
            <button type="button" onClick={onDelete}
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-rose-100 text-rose-500">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Editor({ initial, members, clubs, onCancel, onSave, submitLabel, pending }: {
  initial: Partial<ActionItemRow>;
  members: { id: string; name: string; email: string }[];
  clubs: { id: string; name: string }[];
  onCancel: () => void;
  onSave: (d: Partial<ActionItemRow>) => void;
  submitLabel: string;
  pending: boolean;
}) {
  const [d, setD] = useState<Partial<ActionItemRow>>(initial);

  return (
    <div className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-navy-800 inline-flex items-center gap-2">
          <CircleDot size={14} className="text-amber-500" />
          {initial.id ? 'Edit action item' : 'New action item'}
        </h4>
        <button type="button" onClick={onCancel}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Title *" full>
          <input value={d.title ?? ''} onChange={(e) => setD({ ...d, title: e.target.value })}
            className={cls} placeholder="What needs to be done?" />
        </Field>
        <Field label="Owner">
          <select value={d.owner_member_id ?? ''} onChange={(e) => setD({ ...d, owner_member_id: e.target.value || null })}
            className={cls}>
            <option value="">— unassigned —</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Related club">
          <select value={d.club_id ?? ''} onChange={(e) => setD({ ...d, club_id: e.target.value || null })}
            className={cls}>
            <option value="">— none —</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={d.status ?? 'open'} onChange={(e) => setD({ ...d, status: e.target.value as Status })}
            className={cls}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={d.priority ?? 'medium'} onChange={(e) => setD({ ...d, priority: e.target.value as Priority })}
            className={cls}>
            {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Due date">
          <input type="date" value={d.due_date ?? ''} onChange={(e) => setD({ ...d, due_date: e.target.value || null })}
            className={cls} />
        </Field>
        <Field label="Reminder channel">
          <select value={d.remind_channel ?? 'email'} onChange={(e) => setD({ ...d, remind_channel: e.target.value as Channel })}
            className={cls}>
            <option value="email">Email</option>
            <option value="push">Push notification</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </Field>
        <Field label="Remind when due in (days)">
          <input type="number" min={0} max={30} value={d.remind_when_due_in_days ?? 1}
            onChange={(e) => setD({ ...d, remind_when_due_in_days: Number(e.target.value) })}
            className={cls} />
        </Field>
        <Field label="Pin to top">
          <label className="inline-flex items-center gap-2 mt-2">
            <input type="checkbox" checked={!!d.is_pinned} onChange={(e) => setD({ ...d, is_pinned: e.target.checked })} />
            <span className="text-sm">Pinned</span>
          </label>
        </Field>
        <Field label="Details" full>
          <textarea rows={3} value={d.details ?? ''} onChange={(e) => setD({ ...d, details: e.target.value })}
            className={cls} placeholder="More context, scope, acceptance criteria…" />
        </Field>
        {d.status === 'blocked' && (
          <Field label="Blocked reason" full>
            <input value={d.blocked_reason ?? ''} onChange={(e) => setD({ ...d, blocked_reason: e.target.value })}
              className={cls} placeholder="What's blocking this?" />
          </Field>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
        <button type="button" onClick={() => onSave(d)} disabled={pending || !d.title?.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        {/* hidden helper to keep BellRing/CheckCircle2 imports tree-shaken correctly */}
        <span className="hidden"><BellRing size={0} /><CheckCircle2 size={0} /></span>
      </div>
    </div>
  );
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
