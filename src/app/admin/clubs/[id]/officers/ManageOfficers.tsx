'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, UserMinus, MapPin, ChevronDown, X, Loader2, Save, AlertCircle, Users } from 'lucide-react';

type MemberOpt = { id: string; name: string; email: string | null };
type OfficerOpt = {
  id: string; member_id: string; member_name: string; role: string;
  officer_type: string | null; is_district_cabinet: boolean; status: string;
};

/** Titles offered per officer type — mirrors the Lions portal Title Type list. */
const TITLES: Record<'officer' | 'chairperson', { value: string; label: string }[]> = {
  officer: [
    { value: 'club_president', label: 'Club President' },
    { value: 'club_secretary', label: 'Club Secretary' },
    { value: 'club_treasurer', label: 'Club Treasurer' },
    { value: 'club_officer', label: 'Club Officer' },
  ],
  chairperson: [
    { value: 'zone_chairperson', label: 'Zone Chairperson' },
    { value: 'region_chairperson', label: 'Region Chairperson' },
    { value: 'cabinet_officer', label: 'District Cabinet Officer' },
  ],
};

type Action = 'create' | 'end' | 'address';
const ACTIONS: { key: Action; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'create', label: 'Create New Assignment', icon: UserPlus },
  { key: 'end', label: 'End Assignment', icon: UserMinus },
  { key: 'address', label: 'Add Officer Address', icon: MapPin },
];

export default function ManageOfficers({
  clubId, members, officers,
}: { clubId: string; members: MemberOpt[]; officers: OfficerOpt[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <>
      <div className="relative inline-block" ref={menuRef}>
        <button type="button" onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-md bg-navy-800 hover:bg-navy-900 text-white px-4 py-2 text-sm font-semibold">
          <Users size={15} /> Manage Officers <ChevronDown size={14} className={menuOpen ? 'rotate-180 transition' : 'transition'} />
        </button>
        {menuOpen && (
          <div className="absolute z-20 mt-1 w-60 rounded-lg border bg-white shadow-lg py-1">
            {ACTIONS.map((a) => (
              <button key={a.key} type="button"
                onClick={() => { setAction(a.key); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-navy-800 hover:bg-gray-50">
                <a.icon size={15} className="text-emerald-600" /> {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {action && (
        <OfficerModal
          action={action}
          clubId={clubId}
          members={members}
          officers={officers}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}

function OfficerModal({
  action, clubId, members, officers, onClose,
}: { action: Action; clubId: string; members: MemberOpt[]; officers: OfficerOpt[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Create-assignment state.
  const [officerType, setOfficerType] = useState<'officer' | 'chairperson' | ''>('');
  const [role, setRole] = useState('');
  const [memberId, setMemberId] = useState('');
  const [isCabinet, setIsCabinet] = useState(false);
  const [termStart, setTermStart] = useState(new Date().toISOString().slice(0, 10));

  // End-assignment state.
  const [officerId, setOfficerId] = useState('');
  const [termEnd, setTermEnd] = useState(new Date().toISOString().slice(0, 10));

  // Address state.
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const activeOfficers = officers.filter((o) => o.status === 'active');
  const title = action === 'create' ? 'Create New Assignment'
    : action === 'end' ? 'End Assignment' : 'Add Officer Address';

  function onPickType(t: 'officer' | 'chairperson' | '') {
    setOfficerType(t);
    setRole('');
    setIsCabinet(t === 'chairperson'); // chairpersons default to district-cabinet members
  }

  async function post(url: string, method: string, body: unknown): Promise<boolean> {
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(typeof j.error === 'string' ? j.error : `Request failed (${res.status})`);
      return false;
    }
    return true;
  }

  function submit() {
    setError(null);
    start(async () => {
      let ok = false;
      if (action === 'create') {
        if (!officerType) { setError('Select an Officer Type.'); return; }
        if (!role) { setError('Select a Title Type.'); return; }
        if (!memberId) { setError('Select a member.'); return; }
        ok = await post(`/api/crm/clubs/${clubId}/officers`, 'POST', {
          member_id: memberId, role, term_start: termStart, status: 'active',
          officer_type: officerType, is_district_cabinet: isCabinet,
        });
      } else if (action === 'end') {
        if (!officerId) { setError('Select an assignment to end.'); return; }
        ok = await post(`/api/crm/officers/${officerId}`, 'PATCH', { status: 'past', term_end: termEnd });
      } else {
        if (!officerId) { setError('Select an officer.'); return; }
        if (!address.trim() && !phone.trim() && !email.trim()) { setError('Enter an address, phone or email.'); return; }
        ok = await post(`/api/crm/officers/${officerId}`, 'PATCH', {
          address: address.trim() || null, contact_phone: phone.trim() || null, contact_email: email.trim() || null,
        });
      }
      if (ok) { onClose(); router.refresh(); }
    });
  }

  const inputCls = 'w-full px-3 py-2 border rounded-md text-sm bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
          <h3 className="font-semibold text-navy-800">{title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full border text-gray-500 hover:text-gray-800 flex items-center justify-center"><X size={15} /></button>
        </div>

        <div className="p-5 space-y-3">
          {action === 'create' && (
            <>
              <label className="block">
                <span className={labelCls}>Officer Type <span className="text-red-500">*</span></span>
                <select className={inputCls} value={officerType} onChange={(e) => onPickType(e.target.value as 'officer' | 'chairperson' | '')}>
                  <option value="">— None —</option>
                  <option value="officer">Officer</option>
                  <option value="chairperson">Chairperson</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Title Type <span className="text-red-500">*</span></span>
                <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} disabled={!officerType}>
                  <option value="">{officerType ? '— Select title —' : 'Pick an officer type first'}</option>
                  {officerType && TITLES[officerType].map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Member <span className="text-red-500">*</span></span>
                <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                  <option value="">— Select member —</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.email ? ` — ${m.email}` : ''}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-800">
                <input type="checkbox" checked={isCabinet} onChange={(e) => setIsCabinet(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-emerald-600" />
                Member of the district cabinet
              </label>
              <label className="block">
                <span className={labelCls}>Term start</span>
                <input type="date" className={inputCls} value={termStart} onChange={(e) => setTermStart(e.target.value)} />
              </label>
            </>
          )}

          {action === 'end' && (
            <>
              <label className="block">
                <span className={labelCls}>Assignment to end <span className="text-red-500">*</span></span>
                <select className={inputCls} value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
                  <option value="">— Select active officer —</option>
                  {activeOfficers.map((o) => <option key={o.id} value={o.id}>{o.member_name} — {o.role.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>End date</span>
                <input type="date" className={inputCls} value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
              </label>
              {activeOfficers.length === 0 && <p className="text-xs text-gray-500">No active assignments to end.</p>}
            </>
          )}

          {action === 'address' && (
            <>
              <label className="block">
                <span className={labelCls}>Officer <span className="text-red-500">*</span></span>
                <select className={inputCls} value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
                  <option value="">— Select officer —</option>
                  {officers.map((o) => <option key={o.id} value={o.id}>{o.member_name} — {o.role.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Address</span>
                <textarea className={inputCls} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Mailing address" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Phone</span>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label className="block">
                  <span className={labelCls}>Email</span>
                  <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              </div>
            </>
          )}

          {error && <p className="inline-flex items-center gap-1.5 text-sm text-red-700"><AlertCircle size={14} /> {error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={submit} disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold disabled:opacity-60">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {pending ? 'Saving…' : action === 'create' ? 'Create assignment' : action === 'end' ? 'End assignment' : 'Save address'}
          </button>
        </div>
      </div>
    </div>
  );
}
