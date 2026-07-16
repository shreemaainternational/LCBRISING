'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Sparkles, ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type OfficerRow = {
  row: number;
  name: string;
  lions_member_id: string;
  title: string;
  role: string;
  email: string;
  phone: string | null;
  term_start: string;
  term_end: string | null;
  club_name: string | null;
  district_name: string | null;
  error?: string;
};

type RowResult = { row: number; status: string; name?: string; title?: string; reason?: string };
type BulkResponse = {
  total?: number; inserted?: number; updated?: number; failed?: number;
  members_created?: number; placement?: { region: string | null; zone: string | null } | null;
  rows?: RowResult[]; error?: string;
};

const NO_EMAIL_DOMAIN = 'noemail.invalid';
const isPlaceholderEmail = (e: string) => e.endsWith(`@${NO_EMAIL_DOMAIN}`);

function norm(s: string): string { return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  return String(v).trim();
}
function cleanPhone(v: unknown): string | null {
  const s = cell(v); if (!s) return null;
  let d = s.replace(/[^\d+]/g, '');
  d = d.startsWith('+') ? '+' + d.slice(1).replace(/\+/g, '') : d.replace(/\+/g, '');
  if (d.replace(/\D/g, '').length < 7) return null;
  return d.length > 20 ? d.slice(0, 20) : d;
}
/** "7/1/2026" or a Date → "2026-07-01". */
function toISODate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = cell(v); if (!s) return null;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Lions "Official Title" → our lions_role enum (club scope). */
function titleToRole(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('president') && /(vice|1st|2nd|first|second|third)/.test(t)) return 'club_officer';
  if (t.includes('president')) return 'club_president';
  if (t.includes('secretary')) return 'club_secretary';
  if (t.includes('treasurer')) return 'club_treasurer';
  return 'club_officer';
}

const OFFICER_FIELDS: Record<string, string[]> = {
  title: ['officialtitle'],
  start: ['startdate'],
  end: ['enddate'],
  member_id: ['membermemberid'],
  first: ['memberfirstname'],
  last: ['memberlastname'],
  club: ['accountname'],
  district: ['parentdistrict'],
  pref_email_label: ['memberpreferredemail'],
  personal_email: ['memberpersonalemail'],
  work_email: ['memberworkemail'],
  alt_email: ['memberalternateemail'],
  mobile: ['membermobile'],
};

export function BulkOfficerUpload({ region: regionDefault = '', zone: zoneDefault = '' }: { region?: string; zone?: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [region, setRegion] = useState(regionDefault);
  const [zone, setZone] = useState(zoneDefault);
  const [rows, setRows] = useState<OfficerRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResponse | null>(null);
  const [pending, start] = useTransition();

  const validRows = rows?.filter((r) => !r.error) ?? [];
  const invalidRows = rows?.filter((r) => r.error) ?? [];

  async function onFile(file: File) {
    setParseError(null); setResult(null); setRows(null);
    setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { setParseError('The file has no sheets.'); return; }
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true, defval: null });

      // Locate the header row that carries "Official Title" + "Member: Member ID".
      let h = -1;
      for (let i = 0; i < Math.min(matrix.length, 40); i++) {
        const cells = (matrix[i] ?? []).map((c) => norm(cell(c)));
        if (cells.includes('officialtitle') && cells.includes('membermemberid')) { h = i; break; }
      }
      if (h < 0) {
        setParseError('This is not a Lions "Officer Contact Information" export (no "Official Title" / "Member: Member ID" columns). For members, use the member Bulk upload.');
        return;
      }

      const headers = (matrix[h] ?? []).map((c) => norm(cell(c)));
      const col: Record<string, number> = {};
      headers.forEach((hd, idx) => {
        for (const [f, aliases] of Object.entries(OFFICER_FIELDS)) {
          if (col[f] === undefined && aliases.includes(hd)) col[f] = idx;
        }
      });

      const out: OfficerRow[] = [];
      let club = '', district = '';
      for (let i = h + 1; i < matrix.length; i++) {
        const r = matrix[i] ?? [];
        const g = (f: string) => (col[f] === undefined ? '' : cell(r[col[f]]));
        const firstText = cell(r.find((c) => c != null));
        if (/^(Total\b|Confidential Information|Copyright)/i.test(firstText)) break;
        const clubCell = g('club');
        if (clubCell && !/^(sub)?total$/i.test(clubCell)) club = clubCell;
        if (g('district')) district = g('district');

        const title = g('title');
        if (!title) continue;
        // Club officer table only — skip district/region/zone/MD titles.
        if (!/^club\b/i.test(title)) continue;

        const memberId = g('member_id');
        const name = [g('first'), g('last')].filter(Boolean).join(' ').trim();
        const prefLabel = norm(g('pref_email_label'));
        const preferred =
          prefLabel === 'personal' ? g('personal_email')
          : prefLabel === 'work' ? g('work_email')
          : prefLabel.startsWith('alt') ? g('alt_email')
          : '';
        let email = (preferred || g('personal_email') || g('work_email') || g('alt_email')).toLowerCase();
        if (!email && memberId) email = `lci-${memberId}@${NO_EMAIL_DOMAIN}`;
        const term_start = toISODate(g('start'));
        const term_end = toISODate(g('end'));

        let error: string | undefined;
        if (!name || name.length < 2) error = 'Member name missing';
        else if (!memberId) error = 'Membership number missing';
        else if (!term_start) error = 'Start date missing/invalid';

        out.push({
          row: i + 1, name, lions_member_id: memberId, title, role: titleToRole(title),
          email, phone: cleanPhone(g('mobile')), term_start: term_start ?? '', term_end,
          club_name: club || null, district_name: district || null, error,
        });
      }

      if (!out.length) { setParseError('No club officer rows found in the file.'); return; }
      setRows(out);
    } catch (err) {
      setParseError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function submit() {
    if (!validRows.length) return;
    setResult(null);
    start(async () => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      } catch { /* cookie auth */ }

      const res = await fetch('/api/crm/officers/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          region: region.trim() || undefined,
          zone: zone.trim() || undefined,
          officers: validRows.map((r) => ({
            lions_member_id: r.lions_member_id, name: r.name, email: r.email,
            phone: r.phone, whatsapp: r.phone, role: r.role, title: r.title,
            term_start: r.term_start, term_end: r.term_end,
            club_name: r.club_name, district_name: r.district_name,
          })),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as BulkResponse;
      if (!res.ok) { setResult({ error: j.error ?? `Upload failed (${res.status})` }); return; }
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
        className="w-full md:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-indigo-300 bg-white text-indigo-700 text-sm font-semibold shadow-sm hover:bg-indigo-50 transition-colors"
      >
        <ShieldCheck size={16} /> Bulk upload officers (Excel)
      </button>
    );
  }

  return (
    <div className="border-2 border-indigo-300 bg-indigo-50/40 rounded-xl p-4 mb-4 w-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-navy-800 flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-500" /> Bulk upload — Club Officers
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Upload the Lions International <strong>&ldquo;Officer Contact Information&rdquo;</strong> Excel export.
            {' '}Only <strong>Club</strong> officer titles are imported. Each row maps <em>Official Title → role</em>,
            {' '}<em>Start/End Date → term</em>, and links to the member by membership number (the member is created
            {' '}if not already on the roster).
          </p>
        </div>
        <button type="button" onClick={() => { setOpen(false); resetAll(); }} className="w-7 h-7 rounded-full bg-white border text-gray-500 hover:text-gray-800 flex items-center justify-center shrink-0"><X size={14} /></button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
          <Upload size={14} /> Choose file
          <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </label>
        {fileName && <span className="text-xs text-gray-600 inline-flex items-center gap-1"><FileSpreadsheet size={12} /> {fileName}</span>}
        {rows && <button type="button" onClick={resetAll} className="text-xs text-gray-500 hover:underline">Clear</button>}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Region</span>
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Region 5" className="px-3 py-2 border rounded-md text-sm bg-white w-40" />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Zone</span>
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g. Zone 1" className="px-3 py-2 border rounded-md text-sm bg-white w-40" />
        </label>
        <span className="text-xs text-gray-500 pb-2 max-w-md">Optional — places the club under this Region &amp; Zone (District 3232 F1).</span>
      </div>

      {parseError && <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-700"><AlertCircle size={14} /> {parseError}</p>}

      {rows && (
        <div className="mt-4">
          <div className="text-sm text-gray-700 mb-2">
            Parsed <strong>{rows.length}</strong> club officer row(s): {validRows.length} ready
            {invalidRows.length > 0 && <span className="text-red-700"> · {invalidRows.length} with errors (skipped)</span>}
          </div>
          <div className="border rounded-md overflow-auto max-h-72 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 w-8">#</th>
                  <th className="text-left px-2 py-1.5">Officer</th>
                  <th className="text-left px-2 py-1.5">Member #</th>
                  <th className="text-left px-2 py-1.5">Title</th>
                  <th className="text-left px-2 py-1.5">Role</th>
                  <th className="text-left px-2 py-1.5">Term</th>
                  <th className="text-left px-2 py-1.5">Club</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.row}-${r.title}`} className={r.error ? 'border-t bg-red-50' : 'border-t'}>
                    <td className="px-2 py-1 text-gray-400">{r.row}</td>
                    {r.error ? (
                      <td className="px-2 py-1 text-red-700" colSpan={6}>{r.name || r.lions_member_id || '(blank)'} — {r.error}</td>
                    ) : (
                      <>
                        <td className="px-2 py-1 font-medium">{r.name}{isPlaceholderEmail(r.email) && <span className="ml-1 text-amber-700 italic">(no email)</span>}</td>
                        <td className="px-2 py-1">{r.lions_member_id}</td>
                        <td className="px-2 py-1">{r.title}</td>
                        <td className="px-2 py-1 capitalize">{r.role.replace(/_/g, ' ')}</td>
                        <td className="px-2 py-1">{r.term_start}{r.term_end ? ` → ${r.term_end}` : ''}</td>
                        <td className="px-2 py-1">{r.club_name ?? '—'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button type="button" onClick={submit} disabled={pending || !validRows.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold disabled:opacity-60">
              {pending ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
              {pending ? 'Importing…' : `Import ${validRows.length} officer${validRows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4 border rounded-md p-3 bg-green-50 text-sm">
          <div className="inline-flex items-center gap-1.5 text-green-800 font-medium"><CheckCircle2 size={15} /> Appointed {(result.inserted ?? 0) + (result.updated ?? 0)} officer(s)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-gray-700">
            <div>New: <strong>{result.inserted ?? 0}</strong></div>
            <div>Updated: <strong>{result.updated ?? 0}</strong></div>
            <div>Members created: <strong>{result.members_created ?? 0}</strong></div>
            <div>Failed: <strong>{result.failed ?? 0}</strong></div>
          </div>
          {result.placement && (result.placement.region || result.placement.zone) && (
            <div className="mt-1 text-xs text-emerald-700">Club placed under {[result.placement.region, result.placement.zone].filter(Boolean).join(' · ')}.</div>
          )}
          {result.rows?.some((r) => r.status === 'failed') && (
            <details className="mt-2">
              <summary className="cursor-pointer text-gray-700">Show failed rows</summary>
              <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-auto">
                {result.rows!.filter((r) => r.status === 'failed').map((r) => (
                  <li key={r.row} className="text-red-700">row {r.row}: {r.name ?? ''} {r.title ? `(${r.title})` : ''} — {r.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {result?.error && <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-red-700"><AlertCircle size={14} /> {result.error}</p>}
    </div>
  );
}
