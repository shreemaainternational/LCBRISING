'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Download, Sparkles, Building2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ClubRow = {
  row: number;
  name: string;
  club_number: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  charter_date: string | null;
  error?: string;
};

type RowResult = { row: number; status: string; name?: string; reason?: string };
type BulkResponse = {
  total?: number; inserted?: number; updated?: number; failed?: number;
  placement?: { region: string | null; zone: string | null } | null;
  rows?: RowResult[]; error?: string;
};

const TEMPLATE_HEADERS = ['Club Name', 'LCI Club Number', 'City', 'State', 'Country', 'Charter Date'];
const TEMPLATE_SAMPLE = [
  ['Lions Club of Baroda', '26186', 'Vadodara', 'Gujarat', 'India', '1970-05-12'],
  ['Lions Club of Halol', '26214', 'Halol', 'Gujarat', 'India', '1973-11-07'],
];

function norm(s: string): string { return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
  return String(v).trim();
}
/** Parse a charter date, preferring D/M/Y when ambiguous (Indian convention). */
function toISODate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = cell(v); if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    let day = +m[1], month = +m[2];
    if (day <= 12 && month > 12) { const t = day; day = month; month = t; } // clearly M/D/Y
    return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const FIELD_ALIASES: Record<string, string[]> = {
  name: ['clubname', 'name', 'accountname', 'club'],
  club_number: ['lciclubnumber', 'clubnumber', 'clubid', 'lciid', 'lcinumber', 'lci', 'clubno'],
  city: ['city', 'mailingcity'],
  state: ['state', 'stateprovince', 'mailingstateprovince'],
  country: ['country', 'mailingcountry'],
  charter_date: ['charterdate', 'chartered', 'charter', 'charterdt'],
};

export function BulkClubUpload({ region: regionDefault = '', zone: zoneDefault = '' }: { region?: string; zone?: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [region, setRegion] = useState(regionDefault);
  const [zone, setZone] = useState(zoneDefault);
  const [rows, setRows] = useState<ClubRow[] | null>(null);
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

      // Find the header row (with a club-name/account-name column). Handles a
      // banner above the header (Lions exports).
      let h = -1;
      for (let i = 0; i < Math.min(matrix.length, 30); i++) {
        const cells = (matrix[i] ?? []).map((c) => norm(cell(c)));
        if (cells.some((c) => FIELD_ALIASES.name.includes(c))) { h = i; break; }
      }
      if (h < 0) { setParseError('Could not find a "Club Name" (or Account Name) column. Download the template for the expected headers.'); return; }

      const headers = (matrix[h] ?? []).map((c) => norm(cell(c)));
      const col: Record<string, number> = {};
      headers.forEach((hd, idx) => {
        for (const [f, aliases] of Object.entries(FIELD_ALIASES)) {
          if (col[f] === undefined && aliases.includes(hd)) col[f] = idx;
        }
      });

      const out: ClubRow[] = [];
      for (let i = h + 1; i < matrix.length; i++) {
        const r = matrix[i] ?? [];
        const g = (f: string) => (col[f] === undefined ? '' : cell(r[col[f]]));
        const firstText = cell(r.find((c) => c != null));
        if (/^(Total\b|Subtotal|Confidential Information|Copyright)/i.test(firstText)) break;
        const name = g('name');
        if (!name) continue;
        let error: string | undefined;
        if (name.length < 2) error = 'Club name too short';
        out.push({
          row: i + 1, name,
          club_number: g('club_number') || null,
          city: g('city') || null, state: g('state') || null, country: g('country') || null,
          charter_date: toISODate(col.charter_date === undefined ? '' : (r[col.charter_date] ?? '')),
          error,
        });
      }
      if (!out.length) { setParseError('No club rows found in the file.'); return; }
      setRows(out);
    } catch (err) {
      setParseError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE]);
    ws['!cols'] = TEMPLATE_HEADERS.map((hh) => ({ wch: Math.max(14, hh.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clubs');
    XLSX.writeFile(wb, 'club-upload-template.xlsx');
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
      const res = await fetch('/api/crm/clubs/bulk', {
        method: 'POST', headers,
        body: JSON.stringify({
          region: region.trim() || undefined,
          zone: zone.trim() || undefined,
          clubs: validRows.map((r) => ({
            name: r.name, club_number: r.club_number, city: r.city, state: r.state, country: r.country, charter_date: r.charter_date,
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
      <button type="button" onClick={() => setOpen(true)}
        className="w-full md:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-blue-300 bg-white text-blue-700 text-sm font-semibold shadow-sm hover:bg-blue-50 transition-colors">
        <FileSpreadsheet size={16} /> Bulk upload clubs (Excel)
      </button>
    );
  }

  return (
    <div className="border-2 border-blue-300 bg-blue-50/40 rounded-xl p-4 mb-4 w-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-navy-800 flex items-center gap-2"><Sparkles size={14} className="text-blue-500" /> Bulk upload — Clubs</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Upload an <strong>.xlsx / .csv</strong> with columns: Club Name, LCI Club Number, City, State, Country, Charter Date.
            {' '}Existing clubs (matched by LCI number or name) are updated; new ones are created. Only <strong>Club Name</strong> is required.
          </p>
        </div>
        <button type="button" onClick={() => { setOpen(false); resetAll(); }} className="w-7 h-7 rounded-full bg-white border text-gray-500 hover:text-gray-800 flex items-center justify-center shrink-0"><X size={14} /></button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-blue-300 bg-white text-sm text-blue-700 hover:bg-blue-50">
          <Download size={14} /> Download template
        </button>
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
          <Upload size={14} /> Choose file
          <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
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
        <span className="text-xs text-gray-500 pb-2 max-w-md">Optional — places these clubs under this Region &amp; Zone (District 3232 F1).</span>
      </div>

      {parseError && <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-700"><AlertCircle size={14} /> {parseError}</p>}

      {rows && (
        <div className="mt-4">
          <div className="text-sm text-gray-700 mb-2">
            Parsed <strong>{rows.length}</strong> club(s): {validRows.length} ready
            {invalidRows.length > 0 && <span className="text-red-700"> · {invalidRows.length} with errors (skipped)</span>}
          </div>
          <div className="border rounded-md overflow-auto max-h-72 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 w-8">#</th>
                  <th className="text-left px-2 py-1.5">Club</th>
                  <th className="text-left px-2 py-1.5">LCI #</th>
                  <th className="text-left px-2 py-1.5">City</th>
                  <th className="text-left px-2 py-1.5">Chartered</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className={r.error ? 'border-t bg-red-50' : 'border-t'}>
                    <td className="px-2 py-1 text-gray-400">{r.row}</td>
                    {r.error ? (
                      <td className="px-2 py-1 text-red-700" colSpan={4}>{r.name || '(blank)'} — {r.error}</td>
                    ) : (
                      <>
                        <td className="px-2 py-1 font-medium">{r.name}</td>
                        <td className="px-2 py-1">{r.club_number ?? '—'}</td>
                        <td className="px-2 py-1">{[r.city, r.state].filter(Boolean).join(', ') || '—'}</td>
                        <td className="px-2 py-1">{r.charter_date ?? '—'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button type="button" onClick={submit} disabled={pending || !validRows.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold disabled:opacity-60">
              {pending ? <Loader2 className="animate-spin" size={14} /> : <Building2 size={14} />}
              {pending ? 'Importing…' : `Import ${validRows.length} club${validRows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4 border rounded-md p-3 bg-green-50 text-sm">
          <div className="inline-flex items-center gap-1.5 text-green-800 font-medium"><CheckCircle2 size={15} /> {(result.inserted ?? 0)} created · {(result.updated ?? 0)} updated</div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-700">
            <div>Created: <strong>{result.inserted ?? 0}</strong></div>
            <div>Updated: <strong>{result.updated ?? 0}</strong></div>
            <div>Failed: <strong>{result.failed ?? 0}</strong></div>
          </div>
          {result.placement && (result.placement.region || result.placement.zone) && (
            <div className="mt-1 text-xs text-emerald-700">Placed under {[result.placement.region, result.placement.zone].filter(Boolean).join(' · ')}.</div>
          )}
          {result.rows?.some((r) => r.status === 'failed') && (
            <details className="mt-2">
              <summary className="cursor-pointer text-gray-700">Show failed rows</summary>
              <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-auto">
                {result.rows!.filter((r) => r.status === 'failed').map((r) => (
                  <li key={r.row} className="text-red-700">row {r.row}: {r.name ?? ''} — {r.reason}</li>
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
