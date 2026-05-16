'use client';
import { useState, useTransition } from 'react';
import {
  Plus, Save, X, Loader2, Trash2, FileText, CheckCircle2, Calendar,
  MapPin, Users as UsersIcon,
} from 'lucide-react';

export interface ActionItem {
  task: string;
  owner?: string;
  due_date?: string;
  status?: 'open' | 'in_progress' | 'done';
}

export interface MinutesItem {
  id: string;
  agenda_id: string | null;
  title: string;
  meeting_date: string;
  venue: string | null;
  attendees: string[];
  apologies: string[];
  decisions: string[];
  action_items: ActionItem[];
  next_meeting_at: string | null;
  notes_md: string | null;
  attachment_urls: string[];
  signed_off_by: string | null;
  signed_off_at: string | null;
  agenda?: { title?: string } | null;
}

interface Props {
  initialItems: MinutesItem[];
  agendaOptions: { id: string; title: string }[];
}

const empty = (): MinutesItem => ({
  id: '', agenda_id: null, title: '', meeting_date: new Date().toISOString(),
  venue: '', attendees: [], apologies: [], decisions: [], action_items: [],
  next_meeting_at: null, notes_md: '', attachment_urls: [],
  signed_off_by: null, signed_off_at: null,
});

export function MinutesBoard({ initialItems, agendaOptions }: Props) {
  const [items, setItems] = useState<MinutesItem[]>(initialItems);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function create(draft: MinutesItem) {
    start(async () => {
      const res = await fetch('/api/zone/minutes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agenda_id: draft.agenda_id,
          title: draft.title,
          meeting_date: new Date(draft.meeting_date).toISOString(),
          venue: draft.venue || undefined,
          attendees: draft.attendees, apologies: draft.apologies,
          decisions: draft.decisions, action_items: draft.action_items,
          next_meeting_at: draft.next_meeting_at,
          notes_md: draft.notes_md ?? undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.minutes) {
        setItems((cur) => [j.minutes as MinutesItem, ...cur]);
        setComposing(false);
      }
    });
  }

  async function update(id: string, patch: Partial<MinutesItem> & { signOff?: boolean }) {
    setItems((cur) => cur.map((it) => it.id === id ? { ...it, ...patch } as MinutesItem : it));
    start(async () => {
      await fetch(`/api/zone/minutes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    });
  }
  async function destroy(id: string) {
    if (!confirm('Delete these minutes?')) return;
    setItems((cur) => cur.filter((it) => it.id !== id));
    start(async () => { await fetch(`/api/zone/minutes/${id}`, { method: 'DELETE' }); });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{items.length} meeting record{items.length === 1 ? '' : 's'}</p>
        {!composing && (
          <button type="button" onClick={() => setComposing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold">
            <Plus size={14} /> New minutes
          </button>
        )}
      </div>

      {composing && (
        <MinutesEditor
          initial={empty()}
          agendaOptions={agendaOptions}
          onCancel={() => setComposing(false)}
          onSave={create}
          submitLabel="Save minutes"
          pending={pending}
        />
      )}

      <div className="space-y-3">
        {items.length === 0 && !composing && (
          <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
            No minutes captured yet. Click <strong>New minutes</strong> to start.
          </div>
        )}
        {items.map((it) => editingId === it.id ? (
          <MinutesEditor
            key={it.id}
            initial={it}
            agendaOptions={agendaOptions}
            onCancel={() => setEditingId(null)}
            onSave={(draft) => { update(it.id, draft); setEditingId(null); }}
            submitLabel="Save changes"
            pending={pending}
          />
        ) : (
          <MinutesCard
            key={it.id} item={it}
            onEdit={() => setEditingId(it.id)}
            onSignOff={() => update(it.id, { signOff: true })}
            onDelete={() => destroy(it.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MinutesCard({ item, onEdit, onSignOff, onDelete }: {
  item: MinutesItem; onEdit: () => void; onSignOff: () => void; onDelete: () => void;
}) {
  const signed = !!item.signed_off_at;
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${signed ? 'border-emerald-300' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-navy-800">{item.title}</h3>
            {signed && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={11} /> Signed off
              </span>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1"><Calendar size={11} /> {new Date(item.meeting_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {item.venue && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {item.venue}</span>}
            <span className="inline-flex items-center gap-1"><UsersIcon size={11} /> {item.attendees.length} attendees</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!signed && (
            <button type="button" onClick={onSignOff}
              className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1">
              <CheckCircle2 size={11} /> Sign off
            </button>
          )}
          <button type="button" onClick={onEdit}
            className="px-3 py-1.5 rounded-md border text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Edit
          </button>
          <button type="button" onClick={onDelete}
            className="px-2 py-1.5 rounded-md text-rose-500 hover:bg-rose-50">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
        <Section title="Decisions" empty="No decisions recorded">
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            {item.decisions.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </Section>
        <Section title="Action items" empty="No action items">
          <ul className="space-y-1.5 text-gray-700 text-xs">
            {item.action_items.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                  a.status === 'done' ? 'bg-emerald-500' : a.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                <span>
                  <strong>{a.task}</strong>
                  {a.owner && <span className="text-gray-500"> · {a.owner}</span>}
                  {a.due_date && <span className="text-gray-500"> · due {a.due_date}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Attendees" empty="No attendees recorded">
          <p className="text-xs text-gray-700 leading-snug">{item.attendees.join(' · ')}</p>
          {item.apologies.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-1">Apologies: {item.apologies.join(', ')}</p>
          )}
        </Section>
      </div>

      {item.notes_md && (
        <div className="mt-4 pt-3 border-t">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1 mb-1">
            <FileText size={12} /> Notes
          </h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.notes_md}</p>
        </div>
      )}

      {item.next_meeting_at && (
        <div className="mt-3 text-xs text-blue-700 inline-flex items-center gap-1">
          <Calendar size={11} /> Next meeting: {new Date(item.next_meeting_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{title}</h4>
      {children}
      {/* fall-through hint when array is empty */}
      <div className="text-xs text-gray-400 italic only:block">{empty}</div>
    </div>
  );
}

function MinutesEditor({ initial, agendaOptions, onCancel, onSave, submitLabel, pending }: {
  initial: MinutesItem;
  agendaOptions: { id: string; title: string }[];
  onCancel: () => void;
  onSave: (m: MinutesItem) => void;
  submitLabel: string;
  pending: boolean;
}) {
  const [d, setD] = useState<MinutesItem>(initial);
  const [attendeesRaw, setAttendeesRaw] = useState(initial.attendees.join(', '));
  const [apologiesRaw, setApologiesRaw] = useState(initial.apologies.join(', '));
  const [decisionsRaw, setDecisionsRaw] = useState(initial.decisions.join('\n'));
  const [actionsRaw, setActionsRaw] = useState(initial.action_items.map((a) =>
    `${a.task}${a.owner ? ` | ${a.owner}` : ''}${a.due_date ? ` | ${a.due_date}` : ''}${a.status ? ` | ${a.status}` : ''}`).join('\n'));

  function save() {
    if (!d.title.trim()) return;
    const out: MinutesItem = {
      ...d,
      attendees: attendeesRaw.split(',').map((s) => s.trim()).filter(Boolean),
      apologies: apologiesRaw.split(',').map((s) => s.trim()).filter(Boolean),
      decisions: decisionsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
      action_items: actionsRaw.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
        const [task, owner, due, status] = line.split('|').map((p) => p.trim());
        return {
          task,
          owner: owner || undefined,
          due_date: due || undefined,
          status: (status === 'open' || status === 'in_progress' || status === 'done' ? status : 'open') as ActionItem['status'],
        };
      }),
    };
    onSave(out);
  }

  return (
    <div className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-navy-800">{initial.id ? 'Edit minutes' : 'New minutes'}</h4>
        <button type="button" onClick={onCancel}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Meeting title *" full>
          <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })}
            className={cls} placeholder="Zone Cabinet Meeting · Eye Camp Review · …" />
        </Field>
        <Field label="Linked agenda item">
          <select value={d.agenda_id ?? ''} onChange={(e) => setD({ ...d, agenda_id: e.target.value || null })}
            className={cls}>
            <option value="">— none —</option>
            {agendaOptions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </Field>
        <Field label="Meeting date *">
          <input type="datetime-local" value={toLocal(d.meeting_date)}
            onChange={(e) => setD({ ...d, meeting_date: e.target.value ? new Date(e.target.value).toISOString() : d.meeting_date })}
            className={cls} />
        </Field>
        <Field label="Venue">
          <input value={d.venue ?? ''} onChange={(e) => setD({ ...d, venue: e.target.value })}
            className={cls} placeholder="Hall, address or Zoom link" />
        </Field>
        <Field label="Next meeting (optional)">
          <input type="datetime-local" value={d.next_meeting_at ? toLocal(d.next_meeting_at) : ''}
            onChange={(e) => setD({ ...d, next_meeting_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className={cls} />
        </Field>

        <Field label="Attendees (comma-separated)" full>
          <input value={attendeesRaw} onChange={(e) => setAttendeesRaw(e.target.value)}
            className={cls} placeholder="Lion A, Lion B, Lion C" />
        </Field>
        <Field label="Apologies (comma-separated)" full>
          <input value={apologiesRaw} onChange={(e) => setApologiesRaw(e.target.value)}
            className={cls} placeholder="Lion X, Lion Y" />
        </Field>
        <Field label="Decisions (one per line)" full>
          <textarea rows={3} value={decisionsRaw} onChange={(e) => setDecisionsRaw(e.target.value)}
            className={cls} placeholder={'Approve next month\'s budget\nNominate Lion A as event chair'} />
        </Field>
        <Field label="Action items (one per line, pipe-separated: task | owner | due | status)" full>
          <textarea rows={3} value={actionsRaw} onChange={(e) => setActionsRaw(e.target.value)}
            className={cls}
            placeholder={'Confirm hospital partnership | Lion A | 2026-05-30 | open\nDraft eye-camp budget | Lion B | 2026-06-05 | in_progress'} />
        </Field>
        <Field label="Free-form notes" full>
          <textarea rows={4} value={d.notes_md ?? ''} onChange={(e) => setD({ ...d, notes_md: e.target.value })}
            className={cls} placeholder="Notes, discussion summary, attachments…" />
        </Field>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
        <button type="button" onClick={save} disabled={pending || !d.title.trim()}
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

function toLocal(iso: string): string {
  const dt = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
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
