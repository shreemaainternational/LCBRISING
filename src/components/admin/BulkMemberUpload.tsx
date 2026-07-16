'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Download, Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ClubOption = { id: string; name: string };

type ParsedRow = {
  row: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  role: string;
  status: string;
  club_id: string | null;
  club_label: string | null;
  club_name: string | null;
  district_name: string | null;
  birthday: string | null;
  lions_member_id: string | null;
  error?: string;
};

type RowResult = {
  row: number;
  status: 'inserted' | 'updated' | 'skipped' | 'failed' | 'valid';
  name?: string;
  email?: string;
  reason?: string;
};

type BulkResponse = {
  total?: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  clubs_created?: number;
  placement?: { region: string | null; zone: string | null } | null;
  to_insert?: number;
  dry_run?: boolean;
  rows?: RowResult[];
  error?: string;
};

const ROLES = ['admin', 'president', 'secretary', 'treasurer', 'officer', 'member'];
const STATUSES = ['active', 'lapsed', 'suspended', 'pending'];
// Many Lions exports have members without an email, but members.email is
// NOT NULL UNIQUE. Synthesize a guaranteed-undeliverable placeholder from the
// (unique) membership number so every member imports; admins edit it later.
const NO_EMAIL_DOMAIN = 'noemail.invalid';
const isPlaceholderEmail = (e: string | null | undefined) => !!e && e.endsWith(`@${NO_EMAIL_DOMAIN}`);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Simple template columns (for admins who prefer a clean manual sheet).
const TEMPLATE_HEADERS = [
  'Name', 'Email', 'Phone', 'WhatsApp', 'Role', 'Status', 'Club', 'Birthday', 'Membership Number',
];
const TEMPLATE_SAMPLE = [
  ['Lion Ramesh Patel', 'ramesh@example.com', '+919876543210', '+919876543210', 'member', 'active', '', '1980-04-15', '1234567'],
  ['Lion Priya Sharma', 'priya@example.com', '+919812345678', '', 'officer', 'active', '', '', '2345678'],
];

/** Strip everything but a-z0-9 so header matching is punctuation/space-insensitive. */
function norm(s: string): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  return String(v).trim();
}

/** Keep a leading + and digits only; return null when clearly not a phone. */
function cleanPhone(v: unknown): string | null {
  const s = cell(v);
  if (!s) return null;
  let d = s.replace(/[^\d+]/g, '');
  // Only a single leading '+' is allowed.
  d = d.startsWith('+') ? '+' + d.slice(1).replace(/\+/g, '') : d.replace(/\+/g, '');
  const digits = d.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return d.length > 20 ? d.slice(0, 20) : d;
}

/** Normalize a birthday cell (Date object, Excel serial, or string) → YYYY-MM-DD. */
function toDateString(v: unknown): string | null {
  if (v == null || v === '') return null;
  const asDate = v instanceof Date ? v : new Date(String(v).trim());
  if (isNaN(asDate.getTime())) {
    const s = String(v).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  const y = asDate.getFullYear();
  const m = String(asDate.getMonth() + 1).padStart(2, '0');
  const d = String(asDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// -------- Simple template header aliases --------
const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'fullname', 'membername', 'lionname'],
  email: ['email', 'emailid', 'emailaddress', 'mail'],
  phone: ['phone', 'mobile', 'mobilenumber', 'phonenumber', 'contact', 'contactnumber'],
  whatsapp: ['whatsapp', 'whatsappnumber', 'wa', 'whatsappno'],
  role: ['role', 'memberrole', 'designation'],
  status: ['status', 'memberstatus'],
  club: ['club', 'clubname', 'clubid'],
  birthday: ['birthday', 'dob', 'dateofbirth', 'birthdate'],
  lions_member_id: ['lionsmemberid', 'lionsid', 'lcimemberid', 'lciid', 'memberid', 'membershipnumber', 'lionmemberid', 'contactmemberid'],
};

// -------- Lions International export column aliases (normalized) --------
const LIONS_FIELDS: Record<string, string[]> = {
  member_id: ['contactmemberid'],
  salutation: ['contactsalutation'],
  first: ['contactfirstname'],
  last: ['contactlastname'],
  club: ['accountname'],
  district: ['parentdistrict'],
  // "Preferred Email"/"Preferred Phone" columns hold a *label* (e.g. "Personal",
  // "Mobile") naming which field is preferred — not the value itself. The real
  // address/number lives in the type-specific columns below.
  pref_email_label: ['contactpreferredemail'],
  personal_email: ['contactpersonalemail'],
  work_email: ['contactworkemail'],
  alt_email: ['contactalternateemail'],
  mobile: ['contactmobile'],
  home_phone: ['contacthomephone'],
  work_phone: ['contactworkphone'],
  membership_type: ['membershipfulltype'],
};

export function BulkMemberUpload({ clubs = [] }: { clubs?: ClubOption[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState<'lions' | 'template' | null>(null);
  const [region, setRegion] = useState('');
  const [zone, setZone] = useState('');
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResponse | null>(null);
  const [pending, start] = useTransition();

  const clubByName = new Map(clubs.map((c) => [c.name.toLowerCase().trim(), c]));
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  const validRows = rows?.filter((r) => !r.error) ?? [];
  const invalidRows = rows?.filter((r) => r.error) ?? [];

  function resolveClub(nameOrId: string): { club_id: string | null; club_label: string | null } {
    if (!nameOrId) return { club_id: null, club_label: null };
    if (UUID_RE.test(nameOrId) && clubById.has(nameOrId)) {
      return { club_id: nameOrId, club_label: clubById.get(nameOrId)!.name };
    }
    const found = clubByName.get(nameOrId.toLowerCase().trim());
    if (found) return { club_id: found.id, club_label: found.name };
    return { club_id: null, club_label: `${nameOrId} (not found)` };
  }

  /** Parse the Lions International "Member Contact Information" export. */
  function parseLions(matrix: unknown[][], hIdx: number): ParsedRow[] | string {
    const headers = (matrix[hIdx] ?? []).map((c) => norm(cell(c)));
    const col: Record<string, number> = {};
    headers.forEach((h, idx) => {
      for (const [f, aliases] of Object.entries(LIONS_FIELDS)) {
        if (col[f] === undefined && aliases.includes(h)) col[f] = idx;
      }
    });
    if (col.member_id === undefined) {
      return 'This looks like a Lions International export but the "Contact Member ID" column was not found.';
    }

    const out: ParsedRow[] = [];
    let lastClub = '';
    let lastDistrict = '';
    for (let i = hIdx + 1; i < matrix.length; i++) {
      const r = matrix[i] ?? [];
      const g = (f: string) => (col[f] === undefined ? '' : cell(r[col[f]]));

      // Stop at the report footer (Total / Confidential / Copyright rows).
      const firstText = cell(r.find((c) => c != null));
      if (/^(Total\b|Confidential Information|Copyright)/i.test(firstText)) break;

      // Club/District only appear on the first row of each group → carry down.
      const clubCell = g('club');
      if (clubCell) lastClub = clubCell;
      const districtCell = g('district');
      if (districtCell) lastDistrict = districtCell;

      const memberId = g('member_id');
      const name = [g('first'), g('last')].filter(Boolean).join(' ').trim();
      if (!memberId && !name) continue; // blank spacer row

      // Honour the "Preferred Email" label (Personal/Work/Alternate), then fall
      // back to whichever address column is populated.
      const prefLabel = norm(g('pref_email_label'));
      const preferred =
        prefLabel === 'personal' ? g('personal_email')
        : prefLabel === 'work' ? g('work_email')
        : prefLabel.startsWith('alt') ? g('alt_email')
        : '';
      let email = (preferred || g('personal_email') || g('work_email') || g('alt_email')).toLowerCase();
      // No email in the export → synthesize a placeholder from the membership
      // number so the member still imports (members.email is NOT NULL UNIQUE).
      if (!email && memberId) email = `lci-${memberId}@${NO_EMAIL_DOMAIN}`;
      const phone = cleanPhone(g('mobile') || g('home_phone') || g('work_phone'));
      const whatsapp = cleanPhone(g('mobile'));
      const status = /\[\s*active\s*\]/i.test(g('membership_type')) ? 'active' : 'pending';
      const { club_id, club_label } = resolveClub(lastClub);

      let error: string | undefined;
      if (!name || name.length < 2) error = 'Name is required';
      else if (!email || !EMAIL_RE.test(email)) error = 'No valid email in export';
      else if (!memberId) error = 'Membership number is required';

      out.push({
        row: i + 1, name, email, phone, whatsapp, role: 'member', status,
        club_id, club_label, club_name: lastClub || null, district_name: lastDistrict || null,
        birthday: null, lions_member_id: memberId || null, error,
      });
    }
    return out;
  }

  /** Parse the clean manual template (headers on row 1). */
  function parseSimple(matrix: unknown[][]): ParsedRow[] | string {
    if (matrix.length < 2) return 'No data rows found below the header row.';
    const headers = (matrix[0] as unknown[]).map((h) => cell(h));
    const cm: Record<string, number> = {};
    headers.forEach((h, idx) => {
      const n = norm(h);
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (cm[field] === undefined && aliases.includes(n)) cm[field] = idx;
      }
    });
    if (cm.name === undefined || cm.email === undefined) {
      return 'Could not find required "Name" and "Email" columns. Download the template for the expected headers.';
    }

    const out: ParsedRow[] = [];
    for (let i = 1; i < matrix.length; i++) {
      const r = matrix[i] as unknown[];
      const get = (f: string) => (cm[f] === undefined ? '' : cell(r[cm[f]]));
      const name = get('name');
      const email = get('email').toLowerCase();
      if (!name && !email && !get('phone') && !get('lions_member_id')) continue;

      const rawRole = norm(get('role'));
      const role = ROLES.includes(rawRole) ? rawRole : 'member';
      const rawStatus = norm(get('status'));
      const status = STATUSES.includes(rawStatus) ? rawStatus : 'active';
      const clubCell = get('club');
      const { club_id, club_label } = resolveClub(clubCell);
      const birthday = toDateString(cm.birthday === undefined ? '' : (r[cm.birthday] ?? ''));
      const lionsMemberId = get('lions_member_id');

      let error: string | undefined;
      if (!name || name.length < 2) error = 'Name is required (min 2 chars)';
      else if (!email || !EMAIL_RE.test(email)) error = 'Valid email required';
      else if (!lionsMemberId) error = 'Membership number is required';

      out.push({
        row: i + 1, name, email,
        phone: get('phone') || null,
        whatsapp: get('whatsapp') || null,
        role, status, club_id, club_label,
        club_name: clubCell || null, district_name: null, birthday,
        lions_member_id: lionsMemberId || null, error,
      });
    }
    return out;
  }

  async function onFile(file: File) {
    setParseError(null); setResult(null); setRows(null); setSource(null);
    setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { setParseError('The file has no sheets.'); return; }
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true, defval: null });
      if (!matrix.length) { setParseError('The file is empty.'); return; }

      // Auto-detect the Lions International export: its header row (with a
      // "Contact Member ID" column) sits a few rows below a title banner. Scan
      // generously and match on the member-id column alone so a slightly
      // different export (extra/missing columns, reordered) is still recognized.
      let lionsHeaderIdx = -1;
      let sawLionsBanner = false;
      const scan = Math.min(matrix.length, 40);
      for (let i = 0; i < scan; i++) {
        const cells = (matrix[i] ?? []).map((c) => norm(cell(c)));
        if (cells.some((c) => c === 'membercontactinformation')) sawLionsBanner = true;
        if (lionsHeaderIdx < 0 && cells.includes('contactmemberid')) lionsHeaderIdx = i;
      }

      const isLions = lionsHeaderIdx >= 0;
      const parsed = isLions ? parseLions(matrix, lionsHeaderIdx) : parseSimple(matrix);
      if (typeof parsed === 'string') {
        // A Lions banner but no usable header row → point the admin at the right export.
        if (sawLionsBanner && lionsHeaderIdx < 0) {
          setParseError('This looks like a Lions International export, but the "Contact Member ID" header row could not be located. Re-download it from MyLion as "Member Contact Information" (Excel) without editing the layout.');
        } else {
          setParseError(parsed);
        }
        return;
      }
      if (!parsed.length) { setParseError('No member rows found in the file.'); return; }
      setSource(isLions ? 'lions' : 'template');
      setRows(parsed);
    } catch (err) {
      setParseError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const aoa = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'member-upload-template.xlsx');
  }

  function payloadRows() {
    return validRows.map((r) => ({
      name: r.name,
      email: r.email,
      phone: r.phone,
      whatsapp: r.whatsapp,
      role: r.role,
      status: r.status,
      club_id: r.club_id,
      // Raw club/district names so the server can find-or-create the club and
      // link the member even when it did not exist in the CRM yet.
      club_name: r.club_name,
      district_name: r.district_name,
      birthday: r.birthday,
      lions_member_id: r.lions_member_id,
    }));
  }

  function submit() {
    if (!validRows.length) return;
    setResult(null);
    start(async () => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* fall back to cookie auth */ }

      const res = await fetch('/api/crm/members/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          members: payloadRows(),
          region: region.trim() || undefined,
          zone: zone.trim() || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as BulkResponse;
      if (!res.ok) {
        setResult({ error: j.error ?? `Upload failed (${res.status})` });
        return;
      }
      setResult(j);
      router.refresh();
    });
  }

  function resetAll() {
    setRows(null); setResult(null); setParseError(null); setFileName(null); setSource(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full md:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-emerald-300 bg-white text-emerald-700 text-sm font-semibold shadow-sm hover:bg-emerald-50 transition-colors"
      >
        <FileSpreadsheet size={16} /> Bulk upload (Excel)
      </button>
    );
  }

  return (
    <div className="border-2 border-emerald-300 bg-emerald-50/40 rounded-xl p-4 mb-4 w-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-navy-800 flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-500" />
            Bulk member upload — Lions International export or Excel / CSV
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Upload the <strong>Lions International &ldquo;Member Contact Information&rdquo;</strong> Excel export as-is
            {' '}(from MyLion / the Lion Portal) — the banner, grouping and footer rows are handled automatically.
            {' '}It maps <em>Contact Member ID → Membership Number</em>, <em>First + Last → Name</em>,
            {' '}<em>Preferred/Personal Email → Email</em>, <em>Mobile → Phone &amp; WhatsApp</em>, and <em>Account Name → Club</em>.
            {' '}A plain <strong>.xlsx / .csv</strong> with columns Name, Email, Phone, WhatsApp, Role, Status, Club,
            {' '}Birthday, Membership Number also works. <strong>Name, Email &amp; Membership Number are required.</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); resetAll(); }}
          className="w-7 h-7 rounded-full bg-white border text-gray-500 hover:text-gray-800 flex items-center justify-center shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-emerald-300 bg-white text-sm text-emerald-700 hover:bg-emerald-50"
        >
          <Download size={14} /> Download template
        </button>

        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
          <Upload size={14} /> Choose file
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />
        </label>
        {fileName && <span className="text-xs text-gray-600 inline-flex items-center gap-1"><FileSpreadsheet size={12} /> {fileName}</span>}
        {rows && (
          <button type="button" onClick={resetAll} className="text-xs text-gray-500 hover:underline">Clear</button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Region</span>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Region 5"
            className="px-3 py-2 border rounded-md text-sm bg-white w-40"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Zone</span>
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="e.g. Zone 1"
            className="px-3 py-2 border rounded-md text-sm bg-white w-40"
          />
        </label>
        <span className="text-xs text-gray-500 pb-2 max-w-md">
          Optional. When set, the club(s) in this file are created/placed under this Region &amp; Zone
          (in District 3232 F1), so the roster organizes zone-wise. Leave blank to import without a zone.
        </span>
      </div>

      {parseError && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {parseError}
        </p>
      )}

      {rows && (
        <div className="mt-4">
          <div className="text-sm text-gray-700 mb-2">
            {source === 'lions' && (
              <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                Lions International format detected
              </span>
            )}
            Parsed <strong>{rows.length}</strong> row(s): {validRows.length} ready
            {invalidRows.length > 0 && <span className="text-red-700"> · {invalidRows.length} with errors (skipped)</span>}
            {validRows.filter((r) => isPlaceholderEmail(r.email)).length > 0 && (
              <span className="text-amber-700"> · {validRows.filter((r) => isPlaceholderEmail(r.email)).length} without email (placeholder generated — edit later)</span>
            )}
          </div>
          <div className="border rounded-md overflow-auto max-h-72 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 w-8">#</th>
                  <th className="text-left px-2 py-1.5">Name</th>
                  <th className="text-left px-2 py-1.5">Email</th>
                  <th className="text-left px-2 py-1.5">Member #</th>
                  <th className="text-left px-2 py-1.5">Phone</th>
                  <th className="text-left px-2 py-1.5">Role</th>
                  <th className="text-left px-2 py-1.5">Status</th>
                  <th className="text-left px-2 py-1.5">Club</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className={r.error ? 'border-t bg-red-50' : 'border-t'}>
                    <td className="px-2 py-1 text-gray-400">{r.row}</td>
                    {r.error ? (
                      <td className="px-2 py-1 text-red-700" colSpan={7}>
                        {r.name || r.email || r.lions_member_id || '(blank)'} — {r.error}
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-1 font-medium">{r.name}</td>
                        <td className={`px-2 py-1 ${isPlaceholderEmail(r.email) ? 'text-amber-700 italic' : ''}`} title={isPlaceholderEmail(r.email) ? 'No email in export — placeholder generated; edit to add a real email' : undefined}>{isPlaceholderEmail(r.email) ? 'no email — placeholder' : r.email}</td>
                        <td className="px-2 py-1">{r.lions_member_id ?? '—'}</td>
                        <td className="px-2 py-1">{r.phone ?? '—'}</td>
                        <td className="px-2 py-1 capitalize">{r.role}</td>
                        <td className="px-2 py-1 capitalize">{r.status}</td>
                        <td className={`px-2 py-1 ${r.club_label?.includes('(not found)') ? 'text-amber-700' : ''}`}>{r.club_label ?? '—'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !validRows.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {pending ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              {pending ? 'Importing…' : `Import ${validRows.length} member${validRows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4 border rounded-md p-3 bg-green-50 text-sm">
          <div className="inline-flex items-center gap-1.5 text-green-800 font-medium">
            <CheckCircle2 size={15} /> Imported {result.inserted ?? 0} member(s)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-gray-700">
            <div>Inserted: <strong>{result.inserted ?? 0}</strong></div>
            <div>Club linked: <strong>{result.updated ?? 0}</strong></div>
            <div>Skipped: <strong>{result.skipped ?? 0}</strong></div>
            <div>Failed: <strong>{result.failed ?? 0}</strong></div>
          </div>
          {(result.clubs_created ?? 0) > 0 && (
            <div className="mt-1 text-xs text-emerald-700">{result.clubs_created} club(s) created from the upload.</div>
          )}
          {result.placement && (result.placement.region || result.placement.zone) && (
            <div className="mt-1 text-xs text-emerald-700">
              Club placed under {[result.placement.region, result.placement.zone].filter(Boolean).join(' · ')}.
            </div>
          )}
          {(result.rows?.some((r) => r.status === 'skipped' || r.status === 'failed')) && (
            <details className="mt-2">
              <summary className="cursor-pointer text-gray-700">Show skipped / failed rows</summary>
              <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-auto">
                {result.rows!
                  .filter((r) => r.status === 'skipped' || r.status === 'failed')
                  .map((r) => (
                    <li key={r.row} className={r.status === 'failed' ? 'text-red-700' : 'text-amber-700'}>
                      row {r.row}: {r.email ?? r.name ?? ''} — {r.reason}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {result?.error && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {result.error}
        </p>
      )}
    </div>
  );
}
