'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Download, MapPin,
} from 'lucide-react';
import {
  mapDistrictHeaders, normalizeDistrictRecord,
  DISTRICT_ALIASES, type CanonicalDistrict,
} from '@/lib/sync/district-map';

type PreviewRow = CanonicalDistrict & { _row: number; _error?: string };

interface UploadResult {
  ok?: boolean;
  result?: { total: number; inserted: number; updated: number; skipped: number; failed: number; failures?: { row: number; reason: string }[] };
  error?: string;
  message?: string;
}

const TEMPLATE_HEADERS = [
  'District Number', 'District Name', 'Multiple District', 'Constitutional Area', 'Status',
  'District Governor', 'Governor Email', 'Governor Phone',
  'First Vice District Governor', 'Second Vice District Governor',
  'Cabinet Secretary', 'Cabinet Treasurer',
  'Clubs', 'Members', 'Regions', 'Zones', 'Effective Date', 'Website', 'Lions Year',
];
const TEMPLATE_SAMPLE = [
  ['3232 F1', 'District 3232 F1', '323', 'ISAAME', 'Active',
    'Lion DG Name', 'dg@example.org', '+919876543210',
    'Lion 1st VDG', 'Lion 2nd VDG', 'Lion CS', 'Lion CT',
    '62', '1840', '4', '11', '2025-07-01', 'https://lions3232f1.org', '2025-26'],
];

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  return String(v).trim();
}

export function DistrictPortalUpload({ districtId }: { districtId?: string } = {}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [pending, start] = useTransition();

  const valid = rows?.filter((r) => !r._error) ?? [];
  const invalid = rows?.filter((r) => r._error) ?? [];

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
      if (!matrix.length) { setParseError('The file is empty.'); return; }

      // Locate the header row: the first row that maps a District Number column
      // plus at least one other district field (skips banner/title rows).
      let headerIdx = -1;
      const scan = Math.min(matrix.length, 30);
      for (let i = 0; i < scan; i++) {
        const col = mapDistrictHeaders(matrix[i] ?? []);
        if (col.code !== undefined && Object.keys(col).length >= 2) { headerIdx = i; break; }
      }
      if (headerIdx < 0) {
        setParseError('Could not find a "District Number" column. Download the template below for the expected headers.');
        return;
      }

      const col = mapDistrictHeaders(matrix[headerIdx]);
      const out: PreviewRow[] = [];
      for (let i = headerIdx + 1; i < matrix.length; i++) {
        const r = matrix[i] ?? [];
        const firstText = cell(r.find((c) => c != null));
        if (/^(Total\b|Grand Total|Confidential|Copyright)/i.test(firstText)) break;
        if (!r.some((c) => c != null && String(c).trim())) continue; // blank spacer

        const get = (field: keyof CanonicalDistrict) => {
          const idx = col[field];
          return idx === undefined ? '' : cell(r[idx]);
        };
        const { record, error } = normalizeDistrictRecord(get);
        if (record) out.push({ ...record, _row: i + 1 });
        else out.push({ code: '', _row: i + 1, _error: error });
      }

      if (!out.length) { setParseError('No district rows found below the header.'); return; }
      setRows(out);
    } catch (err) {
      setParseError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE]);
    ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Districts');
    XLSX.writeFile(wb, 'district-upload-template.xlsx');
  }

  function submit() {
    if (!valid.length) return;
    setResult(null);
    start(async () => {
      // Strip preview-only fields before sending.
      const districts = valid.map(({ _row, _error, ...d }) => { void _row; void _error; return d; });
      const res = await fetch('/api/sync/districts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districts, filename: fileName ?? undefined, district_id: districtId }),
      });
      const j = (await res.json().catch(() => ({}))) as UploadResult;
      if (!res.ok) { setResult({ error: j.message ?? j.error ?? `Upload failed (${res.status})` }); return; }
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
        className="w-full md:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-amber-300 bg-white text-amber-700 text-sm font-semibold shadow-sm hover:bg-amber-50 transition-colors">
        <FileSpreadsheet size={16} /> Upload district export (Excel / CSV)
      </button>
    );
  }

  const knownCols = (Object.keys(DISTRICT_ALIASES) as (keyof CanonicalDistrict)[]).length;

  return (
    <div className="border-2 border-amber-300 bg-amber-50/40 rounded-xl p-4 w-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-navy-800 flex items-center gap-2">
            <MapPin size={14} className="text-amber-500" />
            District data upload — Lions Portal export
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Download your <strong>district report</strong> from the Lions Member Portal as
            {' '}<strong>Excel / CSV</strong> and upload it here. Banner and total rows are handled
            automatically. Columns are matched by name across {knownCols} district fields
            (District Number, Multiple District, Governor, VDGs, Cabinet officers, club / member /
            region / zone counts, …). <strong>District Number is required</strong>; only the columns
            present in your file are updated.
          </p>
        </div>
        <button type="button" onClick={() => { setOpen(false); resetAll(); }}
          className="w-7 h-7 rounded-full bg-white border text-gray-500 hover:text-gray-800 flex items-center justify-center shrink-0">
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-amber-300 bg-white text-sm text-amber-700 hover:bg-amber-50">
          <Download size={14} /> Download template
        </button>
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
          <Upload size={14} /> Choose file
          <input ref={fileInput} type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </label>
        {fileName && <span className="text-xs text-gray-600 inline-flex items-center gap-1"><FileSpreadsheet size={12} /> {fileName}</span>}
        {rows && <button type="button" onClick={resetAll} className="text-xs text-gray-500 hover:underline">Clear</button>}
      </div>

      {parseError && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {parseError}
        </p>
      )}

      {rows && (
        <div className="mt-4">
          <div className="text-sm text-gray-700 mb-2">
            Parsed <strong>{rows.length}</strong> row(s): {valid.length} ready
            {invalid.length > 0 && <span className="text-red-700"> · {invalid.length} with errors (skipped)</span>}
          </div>
          <div className="border rounded-md overflow-auto max-h-72 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 w-8">#</th>
                  <th className="text-left px-2 py-1.5">District</th>
                  <th className="text-left px-2 py-1.5">Name</th>
                  <th className="text-left px-2 py-1.5">MD</th>
                  <th className="text-left px-2 py-1.5">Governor</th>
                  <th className="text-right px-2 py-1.5">Clubs</th>
                  <th className="text-right px-2 py-1.5">Members</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._row} className={r._error ? 'border-t bg-red-50' : 'border-t'}>
                    <td className="px-2 py-1 text-gray-400">{r._row}</td>
                    {r._error ? (
                      <td className="px-2 py-1 text-red-700" colSpan={6}>{r._error}</td>
                    ) : (
                      <>
                        <td className="px-2 py-1 font-medium">{r.code}</td>
                        <td className="px-2 py-1">{r.name ?? '—'}</td>
                        <td className="px-2 py-1">{r.multiple_district_code ?? '—'}</td>
                        <td className="px-2 py-1">{r.governor_name ?? '—'}</td>
                        <td className="px-2 py-1 text-right">{r.club_count ?? '—'}</td>
                        <td className="px-2 py-1 text-right">{r.member_count ?? '—'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <button type="button" onClick={submit} disabled={pending || !valid.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
              {pending ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              {pending ? 'Importing…' : `Import ${valid.length} district${valid.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {result && !result.error && result.result && (
        <div className="mt-4 border rounded-md p-3 bg-green-50 text-sm">
          <div className="inline-flex items-center gap-1.5 text-green-800 font-medium">
            <CheckCircle2 size={15} /> Synced {result.result.inserted + result.result.updated} district(s)
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-gray-700">
            <div>Inserted: <strong>{result.result.inserted}</strong></div>
            <div>Updated: <strong>{result.result.updated}</strong></div>
            <div>Skipped: <strong>{result.result.skipped}</strong></div>
            <div>Failed: <strong>{result.result.failed}</strong></div>
          </div>
          {result.result.failures && result.result.failures.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-gray-700">Show failed rows</summary>
              <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-auto text-red-700">
                {result.result.failures.map((f, i) => <li key={i}>row {f.row}: {f.reason}</li>)}
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
