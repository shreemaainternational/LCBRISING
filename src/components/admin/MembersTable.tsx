'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X, Loader2, Save, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

export type MemberRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: string | null;
  status: string | null;
  club_id: string | null;
  birthday: string | null;
  lions_member_id: string | null;
  joined_at: string | null;
};

type ClubOption = { id: string; name: string };

const ROLES = ['member', 'officer', 'treasurer', 'secretary', 'president', 'admin'];
const STATUSES = ['pending', 'active', 'lapsed', 'suspended'];

function StatusBadge({ status }: { status: string | null }) {
  const v = status === 'active' ? 'success'
    : status === 'lapsed' ? 'warning'
    : status === 'suspended' ? 'danger'
    : 'secondary';
  return <Badge variant={v as 'success' | 'warning' | 'danger' | 'secondary'}>{status ?? '—'}</Badge>;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch { /* fall back to cookie auth */ }
  return headers;
}

export function MembersTable({ members, clubs }: { members: MemberRow[]; clubs: ClubOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Row selection for bulk actions. Held as a Set of member ids.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allIds = useMemo(() => members.map((m) => m.id), [members]);
  // Prune ids that no longer exist (e.g. after a refresh) during render so the
  // count stays honest without a state-syncing effect.
  const selectedLive = useMemo(() => {
    const live = new Set(allIds);
    const next = new Set<string>();
    for (const id of selected) if (live.has(id)) next.add(id);
    return next;
  }, [selected, allIds]);
  const allSelected = selectedLive.size > 0 && selectedLive.size === allIds.length;
  const someSelected = selectedLive.size > 0 && selectedLive.size < allIds.length;

  // Reflect the "some but not all" state on the header checkbox.
  const headerRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    setSelected((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));
  }

  function toggleGroup(ids: string[]) {
    setSelected((s) => {
      const n = new Set(s);
      const allIn = ids.every((id) => n.has(id));
      for (const id of ids) { if (allIn) n.delete(id); else n.add(id); }
      return n;
    });
  }

  function removeSelected() {
    if (selectedLive.size === 0) return;
    const ids = Array.from(selectedLive);
    if (!window.confirm(`Remove ${ids.length} selected member${ids.length === 1 ? '' : 's'} from the roster? This can be restored by an admin.`)) return;
    setError(null);
    start(async () => {
      try {
        const headers = await authHeaders();
        const results = await Promise.allSettled(
          ids.map((id) => fetch(`/api/crm/members/${id}`, { method: 'DELETE', headers })),
        );
        const failed = results.filter(
          (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok),
        ).length;
        if (failed) setError(`${failed} of ${ids.length} deletion${ids.length === 1 ? '' : 's'} failed. The rest were removed.`);
        setSelected(new Set());
        router.refresh();
      } catch {
        setError('Network error while deleting the selected members.');
      }
    });
  }

  // Group the roster club-wise: one section per club (alphabetical), with
  // members who have no club last under "Unassigned".
  const clubNameById = new Map(clubs.map((c) => [c.id, c.name]));
  const groupMap = new Map<string, MemberRow[]>();
  for (const m of members) {
    const key = m.club_id && clubNameById.has(m.club_id) ? clubNameById.get(m.club_id)! : 'Unassigned';
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(m);
  }
  const groups = Array.from(groupMap.entries()).sort((a, b) => {
    if (a[0] === 'Unassigned') return 1;
    if (b[0] === 'Unassigned') return -1;
    return a[0].localeCompare(b[0]);
  });

  function remove(m: MemberRow) {
    if (!window.confirm(`Remove "${m.name ?? m.email ?? 'this member'}" from the roster? This can be restored by an admin.`)) return;
    setError(null);
    setDeletingId(m.id);
    start(async () => {
      try {
        const res = await fetch(`/api/crm/members/${m.id}`, { method: 'DELETE', headers: await authHeaders() });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? `Delete failed (${res.status})`);
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
        <p className="mb-3 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      {selectedLive.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-navy-100 bg-navy-50/70 px-3 py-2">
          <span className="text-sm font-medium text-navy-800">
            {selectedLive.size} selected
          </span>
          <button
            type="button"
            onClick={removeSelected}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 bg-white text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-60"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete selected
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={pending}
            className="text-xs text-gray-600 hover:text-gray-900 hover:underline disabled:opacity-60"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 w-10">
                <input
                  ref={headerRef}
                  type="checkbox"
                  aria-label="Select all members"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 accent-navy-700 cursor-pointer align-middle"
                />
              </th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Member #</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Joined</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([clubName, rows]) => (
              <Fragment key={clubName}>
                <tr className="bg-navy-50/70 border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select all members in ${clubName}`}
                      checked={rows.every((r) => selectedLive.has(r.id))}
                      ref={(el) => {
                        if (el) {
                          const sel = rows.filter((r) => selectedLive.has(r.id)).length;
                          el.indeterminate = sel > 0 && sel < rows.length;
                        }
                      }}
                      onChange={() => toggleGroup(rows.map((r) => r.id))}
                      className="h-4 w-4 rounded border-gray-300 accent-navy-700 cursor-pointer align-middle"
                    />
                  </td>
                  <td colSpan={8} className="px-3 py-2 text-xs font-semibold text-navy-800 uppercase tracking-wide">
                    {clubName} · {rows.length} member{rows.length === 1 ? '' : 's'}
                  </td>
                </tr>
                {rows.map((m) => (
                  <tr key={m.id} className={`border-t ${selectedLive.has(m.id) ? 'bg-navy-50/40' : ''}`}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${m.name ?? m.email ?? 'member'}`}
                        checked={selectedLive.has(m.id)}
                        onChange={() => toggleOne(m.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-navy-700 cursor-pointer align-middle"
                      />
                    </td>
                    <td className="p-3 font-medium">{m.name ?? '—'}</td>
                    <td className="p-3 text-gray-600">{m.lions_member_id ?? '—'}</td>
                    <td className="p-3">{m.email ?? '—'}</td>
                    <td className="p-3">{m.phone ?? '—'}</td>
                    <td className="p-3 capitalize">{m.role ?? '—'}</td>
                    <td className="p-3"><StatusBadge status={m.status} /></td>
                    <td className="p-3 text-gray-500">{m.joined_at ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setError(null); setEditing(m); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
                          title="Edit member"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(m)}
                          disabled={pending && deletingId === m.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 text-red-700 text-xs hover:bg-red-50 disabled:opacity-60"
                          title="Remove member"
                        >
                          {pending && deletingId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditMemberModal
          member={editing}
          clubs={clubs}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function EditMemberModal({
  member, clubs, onClose, onSaved,
}: {
  member: MemberRow;
  clubs: ClubOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: member.name ?? '',
    lions_member_id: member.lions_member_id ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    whatsapp: member.whatsapp ?? '',
    role: member.role ?? 'member',
    status: member.status ?? 'pending',
    club_id: member.club_id ?? '',
    birthday: member.birthday ?? '',
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function save() {
    setError(null);
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    // Build a PATCH payload; blank optional fields become null.
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: form.status,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      club_id: form.club_id || null,
      birthday: form.birthday || null,
      lions_member_id: form.lions_member_id.trim() || null,
    };
    start(async () => {
      try {
        const res = await fetch(`/api/crm/members/${member.id}`, {
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
          <h3 className="font-semibold text-navy-800">Edit member</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>Full Name <span className="text-red-500">*</span></span>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Membership Number</span>
            <input className={inputCls} value={form.lions_member_id} onChange={(e) => set('lions_member_id', e.target.value)} placeholder="LCI member ID" />
          </label>
          <label className="block">
            <span className={labelCls}>Email <span className="text-red-500">*</span></span>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Phone</span>
            <input type="tel" className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>WhatsApp</span>
            <input type="tel" className={inputCls} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Role</span>
            <select className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Status</span>
            <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Club</span>
            <select className={inputCls} value={form.club_id} onChange={(e) => set('club_id', e.target.value)}>
              <option value="">—</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Birthday</span>
            <input type="date" className={inputCls} value={form.birthday ? String(form.birthday).slice(0, 10) : ''} onChange={(e) => set('birthday', e.target.value)} />
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
