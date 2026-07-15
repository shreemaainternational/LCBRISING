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
  birthday: string | null;
  lions_member_id: string | null;
  error?: string;
};

type RowResult = {
  row: number;
  status: 'inserted' | 'skipped' | 'failed' | 'valid';
  name?: string;
  email?: string;
  reason?: string;
};

type BulkResponse = {
  total?: number;
  inserted?: number;
  skipped?: number;
  failed?: number;
  to_insert?: number;
  dry_run?: boolean;
  rows?: RowResult[];
  error?: string;
};

const ROLES = ['admin', 'president', 'secretary', 'treasurer', 'officer', 'member'];
const STATUSES = ['active', 'lapsed', 'suspended', 'pending'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The template columns, in order. Header row an admin fills in Excel.
const TEMPLATE_HEADERS = [
  'Name', 'Email', 'Phone', 'WhatsApp', 'Role', 'Status', 'Club', 'Birthday', 'Lions Member ID',
];
const TEMPLATE_SAMPLE = [
  ['Lion Ramesh Patel', 'ramesh@example.com', '+919876543210', '+919876543210', 'member', 'active', '', '1980-04-15', ''],
  ['Lion Priya Sharma', 'priya@example.com', '+919812345678', '', 'officer', 'active', '', '', ''],
];

/** Strip everything but a-z0-9 so header matching is punctuation/space-insensitive. */
function norm(s: string): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'fullname', 'membername', 'lionname'],
  email: ['email', 'emailid', 'emailaddress', 'mail'],
  phone: ['phone', 'mobile', 'mobilenumber', 'phonenumber', 'contact', 'contactnumber'],
  whatsapp: ['whatsapp', 'whatsappnumber', 'wa', 'whatsappno'],
  role: ['role', 'memberrole', 'designation'],
  status: ['status', 'memberstatus'],
  club: ['club', 'clubname', 'clubid'],
  birthday: ['birthday', 'dob', 'dateofbirth', 'birthdate'],
  lions_member_id: ['lionsmemberid', 'lionsid', 'lcimemberid', 'lciid', 'memberid', 'lionmemberid'],
};

/** Map the sheet's header cells to our field keys. */
function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const n = norm(h);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[field] === undefined && aliases.includes(n)) map[field] = idx;
    }
  });
  return map;
}

/** Normalize a birthday cell (Date object, Excel serial, or string) → YYYY-MM-DD. */
function toDateString(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function cell(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

export function BulkMemberUpload({ clubs = [] }: { clubs?: ClubOption[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResponse | null>(null);
  const [pending, start] = useTransition();

  const clubByName = new Map(clubs.map((c) => [c.name.toLowerCase().trim(), c]));
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  const validRows = rows?.filter((r) => !r.error) ?? [];
  const invalidRows = rows?.filter((r) => r.error) ?? [];

  async function onFile(file: File) {
    setParseError(null);
    setResult(null);
    setRows(null);
    setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { setParseError('The file has no sheets.'); return; }
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true });
      if (matrix.length < 2) { setParseError('No data rows found below the header row.'); return; }

      const headers = (matrix[0] as unknown[]).map((h) => cell(h));
      const cm = buildColumnMap(headers);
      if (cm.name === undefined || cm.email === undefined) {
        setParseError('Could not find required "Name" and "Email" columns. Download the template for the expected headers.');
        return;
      }

      const parsed: ParsedRow[] = [];
      for (let i = 1; i < matrix.length; i++) {
        const r = matrix[i] as unknown[];
        const get = (f: string) => (cm[f] === undefined ? '' : cell(r[cm[f]]));
        const name = get('name');
        const email = get('email').toLowerCase();
        // Skip fully blank rows.
        if (!name && !email && !get('phone') && !get('lions_member_id')) continue;

        const rawRole = norm(get('role'));
        const role = ROLES.includes(rawRole) ? rawRole : 'member';
        const rawStatus = norm(get('status'));
        const status = STATUSES.includes(rawStatus) ? rawStatus : 'active';

        // Resolve club: accept a UUID directly, otherwise match by name.
        let club_id: string | null = null;
        let club_label: string | null = null;
        const clubCell = get('club');
        if (clubCell) {
          if (UUID_RE.test(clubCell) && clubById.has(clubCell)) {
            club_id = clubCell; club_label = clubById.get(clubCell)!.name;
          } else {
            const found = clubByName.get(clubCell.toLowerCase());
            if (found) { club_id = found.id; club_label = found.name; }
            else club_label = `${clubCell} (not found)`;
          }
        }

        const rawBirthday = cm.birthday === undefined ? '' : (r[cm.birthday] ?? '');
        const birthday = toDateString(rawBirthday);

        let error: string | undefined;
        if (!name || name.length < 2) error = 'Name is required (min 2 chars)';
        else if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) error = 'Valid email required';

        parsed.push({
          row: i + 1,
          name,
          email,
          phone: get('phone') || null,
          whatsapp: get('whatsapp') || null,
          role,
          status,
          club_id,
          club_label,
          birthday,
          lions_member_id: get('lions_member_id') || null,
          error,
        });
      }

      if (!parsed.length) { setParseError('No member rows found in the file.'); return; }
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
        body: JSON.stringify({ members: payloadRows() }),
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
    setRows(null); setResult(null); setParseError(null); setFileName(null);
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
            Bulk member upload — Excel / CSV
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Upload an <strong>.xlsx</strong>, <strong>.xls</strong> or <strong>.csv</strong> file. Columns:
            {' '}Name, Email, Phone, WhatsApp, Role, Status, Club, Birthday, Lions Member ID. Only Name &amp; Email are required.
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

      {parseError && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {parseError}
        </p>
      )}

      {rows && (
        <div className="mt-4">
          <div className="text-sm text-gray-700 mb-2">
            Parsed <strong>{rows.length}</strong> row(s): {validRows.length} ready
            {invalidRows.length > 0 && <span className="text-red-700"> · {invalidRows.length} with errors (skipped)</span>}
          </div>
          <div className="border rounded-md overflow-auto max-h-72 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 w-8">#</th>
                  <th className="text-left px-2 py-1.5">Name</th>
                  <th className="text-left px-2 py-1.5">Email</th>
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
                      <td className="px-2 py-1 text-red-700" colSpan={6}>
                        {r.name || r.email || '(blank)'} — {r.error}
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-1 font-medium">{r.name}</td>
                        <td className="px-2 py-1">{r.email}</td>
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
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-700">
            <div>Inserted: <strong>{result.inserted ?? 0}</strong></div>
            <div>Skipped: <strong>{result.skipped ?? 0}</strong></div>
            <div>Failed: <strong>{result.failed ?? 0}</strong></div>
          </div>
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
