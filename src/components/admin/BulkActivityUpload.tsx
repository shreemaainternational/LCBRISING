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
  title: string;
  category: string;
  beneficiaries: number;
  lion_members_count: number;
  service_hours: number;
  amount_raised: number;
  date: string;
  description: string;
  error?: string;
};

type RowResult = {
  row: number;
  status: 'inserted' | 'skipped' | 'failed' | 'valid';
  title?: string;
  date?: string;
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

// App service categories (must match the single-add form + reports).
const CATEGORIES = [
  'vision', 'hunger', 'environment', 'relief', 'diabetes', 'childhood_cancer',
  'humanitarian', 'youth', 'education', 'healthcare', 'women', 'senior', 'other',
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

/** Parse a numeric cell — tolerates commas, currency symbols and blanks. */
function numCell(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

/** Normalize a date cell (Date object, Excel serial, M/D/YYYY, or ISO) → YYYY-MM-DD. */
function toDateString(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const asDate = new Date(s);
  if (isNaN(asDate.getTime())) return null;
  return `${asDate.getFullYear()}-${String(asDate.getMonth() + 1).padStart(2, '0')}-${String(asDate.getDate()).padStart(2, '0')}`;
}

/**
 * Map a Lions portal Cause / Project Type to an app service category.
 * Mirrors the mapping used for the one-off seed import so both paths agree.
 */
function mapCategory(cause: string, title: string, projectType: string): string {
  const c = norm(cause);
  const t = title.toLowerCase();
  const pt = norm(projectType);
  const direct: Record<string, string> = {
    hunger: 'hunger',
    diabetes: 'diabetes',
    environment: 'environment',
    youth: 'youth',
    childhoodcancer: 'childhood_cancer',
    disasterrelief: 'relief',
    vision: 'vision',
    administration: 'other',
  };
  if (direct[c]) return direct[c];
  if (c === 'otherhumanitarianservice') {
    if (/tb\s*kit|t\s*b\s*kit|tb\s*nutrition|blood|health|medical/.test(t) || pt.includes('health') || pt.includes('donation')) {
      return 'healthcare';
    }
    return 'humanitarian';
  }
  return 'other';
}

// -------- Simple template header aliases (normalized) --------
const HEADER_ALIASES: Record<string, string[]> = {
  title: ['title', 'projecttitle', 'activity', 'activityname', 'name'],
  description: ['description', 'details', 'report', 'summary'],
  category: ['category', 'servicecategory', 'cause'],
  beneficiaries: ['beneficiaries', 'peopleserved', 'livesimpacted'],
  lion_members_count: ['lionmembers', 'lionmemberscount', 'totalvolunteers', 'presenceoflionmember', 'volunteers'],
  service_hours: ['servicehours', 'hours', 'totalvolunteerhours', 'volunteerhours'],
  amount_raised: ['amountraised', 'fundsraised', 'totalfundsraised', 'raised'],
  date: ['date', 'enddate', 'activitydate'],
  location: ['location', 'venue', 'place'],
};

// -------- Lions "Service Activities Information" export columns (exact, normalized) --------
const LIONS_FIELDS: Record<string, string> = {
  account: 'sponsoraccountname',
  start_date: 'startdate',
  end_date: 'enddate',
  title: 'title',
  description: 'description',
  cause: 'cause',
  project_type: 'projecttype',
  people_served: 'peopleserved',
  volunteers: 'totalvolunteers',
  hours: 'totalvolunteerhours',
  raised: 'totalfundsraised',
};

export function BulkActivityUpload({ clubs = [] }: { clubs?: ClubOption[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState<'lions' | 'template' | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResponse | null>(null);
  const [pending, start] = useTransition();

  // Default the club to Baroda Rising Star when present, else the first club.
  const defaultClub =
    clubs.find((c) => /baroda rising star/i.test(c.name))?.id ?? clubs[0]?.id ?? '';
  const [clubId, setClubId] = useState<string>(defaultClub);

  const validRows = rows?.filter((r) => !r.error) ?? [];
  const invalidRows = rows?.filter((r) => r.error) ?? [];

  /** Parse the Lions "Service Activities Information" export. */
  function parseLions(matrix: unknown[][], hIdx: number): ParsedRow[] | string {
    const headers = (matrix[hIdx] ?? []).map((c) => norm(cell(c)));
    const col: Record<string, number> = {};
    headers.forEach((h, idx) => {
      for (const [f, alias] of Object.entries(LIONS_FIELDS)) {
        if (col[f] === undefined && h === alias) col[f] = idx;
      }
    });
    if (col.title === undefined) {
      return 'This looks like a Lions service-activities export but the "Title" column was not found.';
    }

    const out: ParsedRow[] = [];
    for (let i = hIdx + 1; i < matrix.length; i++) {
      const r = matrix[i] ?? [];
      const g = (f: string) => (col[f] === undefined ? '' : cell(r[col[f]]));

      // Stop at / skip the report footer + subtotal rows.
      const account = g('account');
      if (/^(subtotal|total|grand total|confidential|copyright)/i.test(account)) continue;
      const title = g('title');
      if (/^(subtotal|total|grand total)$/i.test(title)) continue;
      if (!title) continue; // blank spacer row

      const date = toDateString(r[col.end_date] ?? '') ?? toDateString(r[col.start_date] ?? '');
      const category = mapCategory(g('cause'), title, g('project_type'));

      let error: string | undefined;
      if (title.length < 3) error = 'Title too short (min 3 chars)';
      else if (!date) error = 'Missing / unreadable date';

      out.push({
        row: i + 1,
        title,
        category,
        beneficiaries: Math.round(numCell(col.people_served === undefined ? 0 : r[col.people_served])),
        lion_members_count: Math.round(numCell(col.volunteers === undefined ? 0 : r[col.volunteers])),
        service_hours: numCell(col.hours === undefined ? 0 : r[col.hours]),
        amount_raised: numCell(col.raised === undefined ? 0 : r[col.raised]),
        date: date ?? '',
        description: g('description'),
        error,
      });
    }
    return out;
  }

  /** Parse the clean manual template (headers on row 1). */
  function parseSimple(matrix: unknown[][]): ParsedRow[] | string {
    if (matrix.length < 2) return 'No data rows found below the header row.';
    const headers = (matrix[0] as unknown[]).map((h) => norm(cell(h)));
    const cm: Record<string, number> = {};
    headers.forEach((h, idx) => {
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (cm[field] === undefined && aliases.includes(h)) cm[field] = idx;
      }
    });
    if (cm.title === undefined || cm.date === undefined) {
      return 'Could not find required "Title" and "Date" columns. Download the template for the expected headers.';
    }

    const out: ParsedRow[] = [];
    for (let i = 1; i < matrix.length; i++) {
      const r = matrix[i] as unknown[];
      const get = (f: string) => (cm[f] === undefined ? '' : cell(r[cm[f]]));
      const title = get('title');
      if (!title) continue;

      const date = toDateString(cm.date === undefined ? '' : (r[cm.date] ?? ''));
      const rawCat = norm(get('category'));
      const category = CATEGORIES.includes(rawCat)
        ? rawCat
        : mapCategory(get('category'), title, '');

      let error: string | undefined;
      if (title.length < 3) error = 'Title too short (min 3 chars)';
      else if (!date) error = 'Missing / unreadable date';

      out.push({
        row: i + 1,
        title,
        category,
        beneficiaries: Math.round(numCell(cm.beneficiaries === undefined ? 0 : r[cm.beneficiaries])),
        lion_members_count: Math.round(numCell(cm.lion_members_count === undefined ? 0 : r[cm.lion_members_count])),
        service_hours: numCell(cm.service_hours === undefined ? 0 : r[cm.service_hours]),
        amount_raised: numCell(cm.amount_raised === undefined ? 0 : r[cm.amount_raised]),
        date: date ?? '',
        description: get('description'),
        error,
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

      // Auto-detect the Lions "Service Activities Information" export: its
      // header row (containing a "Title" column alongside "Cause" and
      // "People Served") sits below a title banner + filter block. Scan the
      // first ~40 rows for that combination.
      let lionsHeaderIdx = -1;
      let sawBanner = false;
      const scan = Math.min(matrix.length, 40);
      for (let i = 0; i < scan; i++) {
        const cells = (matrix[i] ?? []).map((c) => norm(cell(c)));
        if (cells.some((c) => c === 'serviceactivitiesinformation')) sawBanner = true;
        if (
          lionsHeaderIdx < 0 &&
          cells.includes('title') &&
          (cells.includes('cause') || cells.includes('peopleserved') || cells.includes('serviceactivityid'))
        ) {
          lionsHeaderIdx = i;
        }
      }

      const isLions = lionsHeaderIdx >= 0;
      const parsed = isLions ? parseLions(matrix, lionsHeaderIdx) : parseSimple(matrix);
      if (typeof parsed === 'string') {
        if (sawBanner && lionsHeaderIdx < 0) {
          setParseError('This looks like a Lions service-activities export, but the "Title" header row could not be located. Re-download it from the Lion Portal without editing the layout.');
        } else {
          setParseError(parsed);
        }
        return;
      }
      if (!parsed.length) { setParseError('No activity rows found in the file.'); return; }
      setSource(isLions ? 'lions' : 'template');
      setRows(parsed);
    } catch (err) {
      setParseError(`Could not read the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const headers = ['Title', 'Date', 'Category', 'Beneficiaries', 'Lion Members', 'Service Hours', 'Amount Raised', 'Location', 'Description'];
    const sample = [
      ['Free Eye Camp', '2026-01-15', 'vision', 320, 12, 48, 0, 'SSG Hospital, Vadodara', 'Screening + cataract referrals.'],
      ['Food for Hunger', '2026-01-26', 'hunger', 350, 28, 224, 2000, 'Karelibaug', 'Meals distributed to 350 beneficiaries.'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activities');
    XLSX.writeFile(wb, 'activity-upload-template.xlsx');
  }

  function payloadRows() {
    return validRows.map((r) => ({
      title: r.title,
      description: r.description || null,
      category: r.category || null,
      beneficiaries: r.beneficiaries,
      lion_members_count: r.lion_members_count,
      service_hours: r.service_hours,
      amount_raised: r.amount_raised,
      date: r.date,
      club_id: clubId || null,
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

      const res = await fetch('/api/activities/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ activities: payloadRows() }),
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

  const totals = validRows.reduce(
    (acc, r) => {
      acc.beneficiaries += r.beneficiaries;
      acc.hours += r.service_hours;
      acc.raised += r.amount_raised;
      return acc;
    },
    { beneficiaries: 0, hours: 0, raised: 0 },
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full md:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-blue-300 bg-white text-blue-700 text-sm font-semibold shadow-sm hover:bg-blue-50 transition-colors"
      >
        <FileSpreadsheet size={16} /> Bulk upload (Excel)
      </button>
    );
  }

  return (
    <div className="border-2 border-blue-300 bg-blue-50/40 rounded-xl p-4 mb-4 w-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-navy-800 flex items-center gap-2">
            <Sparkles size={14} className="text-blue-500" />
            Bulk activity upload — Lions portal export or Excel / CSV
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Upload the Lion Portal <strong>&ldquo;Service Activities Information&rdquo;</strong> Excel export as-is —
            {' '}the banner, filter block and subtotal rows are handled automatically. It maps
            {' '}<em>Title → Project</em>, <em>Cause → Category</em>, <em>People Served → Beneficiaries</em>,
            {' '}<em>Total Volunteers → Lion Members</em>, <em>Volunteer Hours → Service Hours</em>,
            {' '}<em>Funds Raised → Amount Raised</em> and <em>End Date → Date</em>.
            {' '}A plain <strong>.xlsx / .csv</strong> with Title, Date, Category, Beneficiaries, Lion Members,
            {' '}Service Hours, Amount Raised, Location, Description also works.
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
        <label className="text-sm">
          <span className="sr-only">Club</span>
          <select
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 bg-white text-sm"
          >
            <option value="">— No club —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-blue-300 bg-white text-sm text-blue-700 hover:bg-blue-50"
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
            {source === 'lions' && (
              <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                Lions portal format detected
              </span>
            )}
            Parsed <strong>{rows.length}</strong> row(s): {validRows.length} ready
            {invalidRows.length > 0 && <span className="text-red-700"> · {invalidRows.length} with errors (skipped)</span>}
            {validRows.length > 0 && (
              <span className="text-gray-500">
                {' '}· {totals.beneficiaries.toLocaleString('en-IN')} beneficiaries · {totals.hours.toLocaleString('en-IN')} hrs · ₹{totals.raised.toLocaleString('en-IN')} raised
              </span>
            )}
          </div>
          <div className="border rounded-md overflow-auto max-h-72 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 w-8">#</th>
                  <th className="text-left px-2 py-1.5">Title</th>
                  <th className="text-left px-2 py-1.5">Date</th>
                  <th className="text-left px-2 py-1.5">Category</th>
                  <th className="text-right px-2 py-1.5">Beneficiaries</th>
                  <th className="text-right px-2 py-1.5">Members</th>
                  <th className="text-right px-2 py-1.5">Hours</th>
                  <th className="text-right px-2 py-1.5">Raised (₹)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className={r.error ? 'border-t bg-red-50' : 'border-t'}>
                    <td className="px-2 py-1 text-gray-400">{r.row}</td>
                    {r.error ? (
                      <td className="px-2 py-1 text-red-700" colSpan={7}>
                        {r.title || '(blank)'} — {r.error}
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-1 font-medium">{r.title}</td>
                        <td className="px-2 py-1">{r.date}</td>
                        <td className="px-2 py-1 capitalize">{r.category.replace(/_/g, ' ')}</td>
                        <td className="px-2 py-1 text-right">{r.beneficiaries.toLocaleString('en-IN')}</td>
                        <td className="px-2 py-1 text-right">{r.lion_members_count}</td>
                        <td className="px-2 py-1 text-right">{r.service_hours}</td>
                        <td className="px-2 py-1 text-right">{r.amount_raised.toLocaleString('en-IN')}</td>
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 to-navy-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {pending ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              {pending ? 'Importing…' : `Import ${validRows.length} activit${validRows.length === 1 ? 'y' : 'ies'}`}
            </button>
            {source === 'lions' && !clubId && (
              <span className="text-xs text-amber-700 inline-flex items-center gap-1">
                <AlertCircle size={12} /> No club selected — activities will import unlinked.
              </span>
            )}
          </div>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4 border rounded-md p-3 bg-green-50 text-sm">
          <div className="inline-flex items-center gap-1.5 text-green-800 font-medium">
            <CheckCircle2 size={15} /> Imported {result.inserted ?? 0} activit{(result.inserted ?? 0) === 1 ? 'y' : 'ies'}
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
                      row {r.row}: {r.title ?? ''} {r.date ? `(${r.date})` : ''} — {r.reason}
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
