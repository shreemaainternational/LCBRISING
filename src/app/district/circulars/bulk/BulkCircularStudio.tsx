'use client';

import { useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, Download, FileSpreadsheet, Image as ImageIcon, Sparkles, Loader2,
  CheckCircle2, AlertCircle, Wand2, Presentation, Copy, Check, Trash2, Filter,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Region = { id: string; name: string; code: string | null };
type Zone = { id: string; name: string; code: string | null; region_id: string | null };
type Club = { id: string; name: string; zone_id: string | null; region_id: string | null };

type Flyer = { headline: string; subheading: string; body: string; cta: string };
type Slide = { title: string; bullets: string[] };

export type EntryRow = {
  id: string;
  reference_no: string | null;
  entry_type: EntryType;
  title: string;
  description: string | null;
  category: string | null;
  priority: 'info' | 'important' | 'urgent';
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  chief_guest: string | null;
  region_id: string | null;
  zone_id: string | null;
  club_id: string | null;
  source_kind: string;
  source_url: string | null;
  source_filename: string | null;
  extracted: boolean;
  extraction_confidence: string | null;
  short_message: string | null;
  whatsapp_text: string | null;
  social_caption: string | null;
  social_hashtags: string[];
  flyer: Flyer | null;
  presentation: { slides: Slide[] } | null;
  presentation_url: string | null;
  minutes: string | null;
  assets_generated_at: string | null;
  status: string;
  created_at: string;
};

type EntryType =
  | 'circular' | 'event' | 'programme' | 'cabinet_meeting'
  | 'dg_visit' | 'festival' | 'felicitation' | 'other';

type DraftRow = {
  entry_type: EntryType;
  title: string;
  description: string | null;
  category: string | null;
  priority: 'info' | 'important' | 'urgent';
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  chief_guest: string | null;
  region: string | null;
  zone: string | null;
  club: string | null;
  source_kind: string;
  source_url?: string | null;
  source_filename?: string | null;
  extracted?: boolean;
  extraction_confidence?: string | null;
  error?: string;
};

const ENTRY_TYPES: EntryType[] = [
  'circular', 'event', 'programme', 'cabinet_meeting',
  'dg_visit', 'festival', 'felicitation', 'other',
];
const TYPE_LABELS: Record<EntryType, string> = {
  circular: 'Circular', event: 'Event', programme: 'Programme',
  cabinet_meeting: 'Cabinet Meeting', dg_visit: 'DG Visit', festival: 'Festival',
  felicitation: 'Felicitation', other: 'Other',
};
const PRIORITIES = ['info', 'important', 'urgent'] as const;

const TEMPLATE_HEADERS = [
  'Type', 'Title', 'Description', 'Category', 'Priority', 'Date',
  'Start Time', 'End Time', 'Venue', 'Chief Guest', 'Region', 'Zone', 'Club',
];
const TEMPLATE_SAMPLE = [
  ['event', 'Blood Donation Camp', 'Joint camp with the Red Cross', 'health', 'important', '2026-08-15', '9:00 AM', '2:00 PM', 'Town Hall', 'Dr. A. Mehta', '', 'Zone 1', ''],
  ['cabinet_meeting', '2nd Cabinet Meeting', 'Quarterly review of service projects', 'meeting', 'important', '2026-08-20', '6:30 PM', '', 'District Office', 'DG Lion Rajesh', '', '', ''],
  ['dg_visit', 'DG Official Visit — Club Charter Night', 'Governor visiting for charter celebrations', 'visit', 'urgent', '2026-09-05', '7:00 PM', '', 'Grand Hotel', 'District Governor', '', '', 'Lions Club of Baroda Rising Star'],
];

const norm = (s: string) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const cell = (v: unknown) => (v == null ? '' : v instanceof Date ? (isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10)) : String(v).trim());

const HEADER_ALIASES: Record<string, string[]> = {
  entry_type: ['type', 'entrytype', 'kind'],
  title: ['title', 'subject', 'name', 'heading'],
  description: ['description', 'details', 'body', 'message', 'summary'],
  category: ['category', 'tag', 'topic'],
  priority: ['priority'],
  event_date: ['date', 'eventdate', 'on', 'day'],
  start_time: ['starttime', 'time', 'from', 'start'],
  end_time: ['endtime', 'to', 'end', 'till'],
  venue: ['venue', 'location', 'place'],
  chief_guest: ['chiefguest', 'guest', 'dignitary', 'chairperson'],
  region: ['region'],
  zone: ['zone'],
  club: ['club', 'clubname'],
};

function toDateString(v: unknown): string | null {
  const s = cell(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y.length === 2 ? `20${y}` : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function BulkCircularStudio({
  regions, zones, clubs, initialEntries,
}: {
  regions: Region[]; zones: Zone[]; clubs: Club[]; initialEntries: EntryRow[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryRow[]>(initialEntries);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  // Filters (also used as the default scope for newly-saved rows).
  const [fRegion, setFRegion] = useState('');
  const [fZone, setFZone] = useState('');
  const [fClub, setFClub] = useState('');
  const [fType, setFType] = useState('');

  const regionName = useMemo(() => new Map(regions.map((r) => [r.id, r.name])), [regions]);
  const zoneName = useMemo(() => new Map(zones.map((z) => [z.id, `${z.code ? z.code + ' ' : ''}${z.name}`])), [zones]);
  const clubName = useMemo(() => new Map(clubs.map((c) => [c.id, c.name])), [clubs]);

  const visibleZones = fRegion ? zones.filter((z) => z.region_id === fRegion) : zones;
  const visibleClubs = fClub || fZone
    ? clubs.filter((c) => (fZone ? c.zone_id === fZone : true) && (fRegion ? c.region_id === fRegion : true))
    : fRegion ? clubs.filter((c) => c.region_id === fRegion) : clubs;

  const filtered = entries.filter((e) =>
    (!fRegion || e.region_id === fRegion) &&
    (!fZone || e.zone_id === fZone) &&
    (!fClub || e.club_id === fClub) &&
    (!fType || e.entry_type === fType));

  function scopeLabel(e: EntryRow): string {
    if (e.club_id) return clubName.get(e.club_id) ?? 'Club';
    if (e.zone_id) return `Zone: ${zoneName.get(e.zone_id) ?? ''}`.trim();
    if (e.region_id) return `Region: ${regionName.get(e.region_id) ?? ''}`.trim();
    return 'District-wide';
  }

  // ---- spreadsheet bulk upload -------------------------------------------
  const [parsing, setParsing] = useState(false);
  const sheetInput = useRef<HTMLInputElement>(null);

  async function onSheet(file: File) {
    setNotice(null); setParsing(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) { setNotice({ ok: false, msg: 'The file has no sheets.' }); return; }
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true, defval: null });
      if (matrix.length < 2) { setNotice({ ok: false, msg: 'No data rows found under the header.' }); return; }

      const headers = (matrix[0] as unknown[]).map((h) => norm(cell(h)));
      const cm: Record<string, number> = {};
      headers.forEach((h, idx) => {
        for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
          if (cm[field] === undefined && aliases.includes(h)) cm[field] = idx;
        }
      });
      if (cm.title === undefined) {
        setNotice({ ok: false, msg: 'Could not find a "Title" column. Download the template for the expected layout.' });
        return;
      }

      const out: DraftRow[] = [];
      for (let i = 1; i < matrix.length; i++) {
        const r = matrix[i] as unknown[];
        const g = (f: string) => (cm[f] === undefined ? '' : cell(r[cm[f]]));
        const title = g('title');
        if (!title) continue;
        const type = norm(g('entry_type')).replace(/[^a-z_]/g, '') as EntryType;
        const priority = norm(g('priority'));
        out.push({
          entry_type: ENTRY_TYPES.includes(type) ? type : 'circular',
          title: title.slice(0, 300),
          description: g('description') || null,
          category: g('category') || null,
          priority: (PRIORITIES as readonly string[]).includes(priority) ? priority as DraftRow['priority'] : 'info',
          event_date: toDateString(cm.event_date === undefined ? '' : r[cm.event_date]),
          start_time: g('start_time') || null,
          end_time: g('end_time') || null,
          venue: g('venue') || null,
          chief_guest: g('chief_guest') || null,
          region: g('region') || null,
          zone: g('zone') || null,
          club: g('club') || null,
          source_kind: 'bulk',
        });
      }
      if (!out.length) { setNotice({ ok: false, msg: 'No rows with a title were found.' }); return; }
      setDrafts((d) => [...d, ...out]);
      setNotice({ ok: true, msg: `Parsed ${out.length} row(s) from ${file.name}. Review below and save.` });
    } catch (err) {
      setNotice({ ok: false, msg: `Could not read the file: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setParsing(false);
      if (sheetInput.current) sheetInput.current.value = '';
    }
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE]);
    ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Circulars');
    XLSX.writeFile(wb, 'district-circular-template.xlsx');
  }

  // ---- flyer / pdf / image auto-extract ----------------------------------
  const [extracting, setExtracting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function extract(file: File | null) {
    setNotice(null); setExtracting(true);
    try {
      const fd = new FormData();
      if (file) fd.append('file', file);
      if (pasteText.trim()) fd.append('text', pasteText.trim());
      const res = await fetch('/api/district/circular-entries/extract', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice({ ok: false, msg: j.error ?? `Extraction failed (${res.status})` }); return; }
      const e = j.entry as Partial<DraftRow>;
      setDrafts((d) => [...d, {
        entry_type: (e.entry_type as EntryType) ?? 'circular',
        title: e.title ?? 'Untitled',
        description: e.description ?? null,
        category: e.category ?? null,
        priority: (e.priority as DraftRow['priority']) ?? 'info',
        event_date: e.event_date ?? null,
        start_time: e.start_time ?? null,
        end_time: e.end_time ?? null,
        venue: e.venue ?? null,
        chief_guest: e.chief_guest ?? null,
        region: null, zone: null, club: null,
        source_kind: e.source_kind ?? 'flyer',
        source_url: e.source_url ?? null,
        source_filename: e.source_filename ?? null,
        extracted: e.extracted ?? false,
        extraction_confidence: e.extraction_confidence ?? null,
      }]);
      setPasteText('');
      setNotice({ ok: true, msg: `Segregated ${file?.name ?? 'notice'} (${j.source === 'ai' ? `AI · ${j.confidence} confidence` : 'template — edit fields below'}). Review and save.` });
    } catch (err) {
      setNotice({ ok: false, msg: `Extraction error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setExtracting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  // ---- save drafts --------------------------------------------------------
  const [saving, startSave] = useTransition();

  function updateDraft(i: number, patch: Partial<DraftRow>) {
    setDrafts((d) => d.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeDraft(i: number) {
    setDrafts((d) => d.filter((_, idx) => idx !== i));
  }

  function saveDrafts() {
    if (!drafts.length) return;
    setNotice(null);
    startSave(async () => {
      const payload = drafts.map((d) => ({
        entry_type: d.entry_type,
        title: d.title,
        description: d.description,
        category: d.category,
        priority: d.priority,
        event_date: d.event_date,
        start_time: d.start_time,
        end_time: d.end_time,
        venue: d.venue,
        chief_guest: d.chief_guest,
        // Fall back to the active filter selection when the row has no scope.
        region: d.region ?? (fRegion || undefined),
        zone: d.zone ?? (fZone || undefined),
        club: d.club ?? (fClub || undefined),
        source_kind: d.source_kind,
        source_url: d.source_url,
        source_filename: d.source_filename,
        extracted: d.extracted,
        extraction_confidence: d.extraction_confidence,
      }));
      const res = await fetch('/api/district/circular-entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: payload }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setNotice({ ok: false, msg: j.error ?? `Save failed (${res.status})` }); return; }
      setEntries((prev) => [...(j.entries as EntryRow[]), ...prev]);
      setDrafts([]);
      setNotice({ ok: true, msg: `Saved ${j.inserted} entr${j.inserted === 1 ? 'y' : 'ies'} to the table.` });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className={`rounded-lg border px-3 py-2 text-sm inline-flex items-center gap-2 ${
          notice.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-rose-300 bg-rose-50 text-rose-800'
        }`}>
          {notice.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {notice.msg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="text-xs font-semibold text-gray-700 mb-2 inline-flex items-center gap-1.5">
          <Filter size={13} className="text-amber-500" /> Filter &amp; default scope — club-wise · zone-wise · region-wise
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select label="Region" value={fRegion} onChange={(v) => { setFRegion(v); setFZone(''); setFClub(''); }}>
            <option value="">All regions</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.code ? `${r.code} · ` : ''}{r.name}</option>)}
          </Select>
          <Select label="Zone" value={fZone} onChange={(v) => { setFZone(v); setFClub(''); }}>
            <option value="">All zones</option>
            {visibleZones.map((z) => <option key={z.id} value={z.id}>{z.code ? `${z.code} · ` : ''}{z.name}</option>)}
          </Select>
          <Select label="Club" value={fClub} onChange={setFClub}>
            <option value="">All clubs</option>
            {visibleClubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Type" value={fType} onChange={setFType}>
            <option value="">All types</option>
            {ENTRY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </Select>
        </div>
      </div>

      {/* Upload paths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="font-semibold text-navy-800 inline-flex items-center gap-2 mb-1">
            <FileSpreadsheet size={15} className="text-emerald-500" /> Bulk upload (spreadsheet)
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Excel / CSV with columns: Type, Title, Description, Category, Priority, Date, Start Time,
            End Time, Venue, Chief Guest, Region, Zone, Club. Only <strong>Title</strong> is required.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-emerald-300 bg-white text-sm text-emerald-700 hover:bg-emerald-50">
              <Download size={14} /> Template
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
              {parsing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Choose sheet
              <input ref={sheetInput} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onSheet(f); }} />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="font-semibold text-navy-800 inline-flex items-center gap-2 mb-1">
            <ImageIcon size={15} className="text-blue-500" /> Auto-extract from flyer / PDF / image
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Drop a flyer photo, poster, PDF or presentation — its details are auto-segregated into the
            table. Or paste the notice text below.
          </p>
          <textarea rows={2} value={pasteText} onChange={(e) => setPasteText(e.target.value)}
            placeholder="Optional — paste circular / notice text here…"
            className="w-full px-3 py-2 border rounded-md text-sm mb-2" />
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-gray-300 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
              {extracting ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Choose flyer / PDF
              <input ref={fileInput} type="file" accept="image/*,application/pdf,.ppt,.pptx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0] ?? null; extract(f); }} />
            </label>
            {pasteText.trim() && (
              <button type="button" onClick={() => extract(null)} disabled={extracting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-60">
                {extracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Segregate text
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Draft staging table */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-amber-300 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-navy-800 inline-flex items-center gap-2">
              <Sparkles size={15} className="text-amber-500" /> Staged — review &amp; save ({drafts.length})
            </h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDrafts([])} className="text-xs text-gray-500 hover:underline">Clear</button>
              <button type="button" onClick={saveDrafts} disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save {drafts.length}
              </button>
            </div>
          </div>
          <div className="border rounded-md overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5">Type</th>
                  <th className="text-left px-2 py-1.5">Title</th>
                  <th className="text-left px-2 py-1.5">Date</th>
                  <th className="text-left px-2 py-1.5">Venue</th>
                  <th className="text-left px-2 py-1.5">Scope (region / zone / club)</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="px-2 py-1">
                      <select value={d.entry_type} onChange={(e) => updateDraft(i, { entry_type: e.target.value as EntryType })}
                        className="border rounded px-1 py-0.5 text-xs">
                        {ENTRY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input value={d.title} onChange={(e) => updateDraft(i, { title: e.target.value })}
                        className="border rounded px-1 py-0.5 text-xs w-48" />
                      {d.extracted && <span className="ml-1 text-[10px] text-blue-600">AI</span>}
                    </td>
                    <td className="px-2 py-1">
                      <input value={d.event_date ?? ''} placeholder="YYYY-MM-DD"
                        onChange={(e) => updateDraft(i, { event_date: e.target.value || null })}
                        className="border rounded px-1 py-0.5 text-xs w-28" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={d.venue ?? ''} onChange={(e) => updateDraft(i, { venue: e.target.value || null })}
                        className="border rounded px-1 py-0.5 text-xs w-32" />
                    </td>
                    <td className="px-2 py-1">
                      <select value={d.club ?? ''} onChange={(e) => updateDraft(i, { club: e.target.value || null })}
                        className="border rounded px-1 py-0.5 text-xs w-40">
                        <option value="">— use filter / district —</option>
                        {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <button type="button" onClick={() => removeDraft(i)} className="text-gray-400 hover:text-rose-600">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saved entries */}
      <div>
        <div className="text-sm text-gray-600 mb-2">
          {filtered.length} of {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
          {(fRegion || fZone || fClub || fType) && ' (filtered)'}
        </div>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-sm text-gray-500">
              No entries yet. Upload a spreadsheet or a flyer above to get started.
            </div>
          ) : filtered.map((e) => (
            <EntryCard key={e.id} entry={e} scope={scopeLabel(e)}
              onUpdate={(u) => setEntries((prev) => prev.map((x) => (x.id === u.id ? u : x)))} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry card with per-entry generation
// ---------------------------------------------------------------------------
function EntryCard({ entry, scope, onUpdate }: { entry: EntryRow; scope: string; onUpdate: (e: EntryRow) => void }) {
  const [open, setOpen] = useState(false);
  const [gen, startGen] = useTransition();
  const [deck, startDeck] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const hasAssets = !!entry.assets_generated_at;

  function generate() {
    setErr(null);
    startGen(async () => {
      const res = await fetch(`/api/district/circular-entries/${entry.id}/generate`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `Failed (${res.status})`); return; }
      onUpdate(j.entry as EntryRow);
      setOpen(true);
    });
  }
  function buildDeck() {
    setErr(null);
    startDeck(async () => {
      const res = await fetch(`/api/district/circular-entries/${entry.id}/presentation`, { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? `Failed (${res.status})`); return; }
      onUpdate({ ...entry, presentation_url: j.presentation_url });
    });
  }

  const meta = [
    entry.event_date, entry.start_time,
    entry.venue, entry.chief_guest ? `Guest: ${entry.chief_guest}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <article className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-bold bg-navy-800 text-white px-2 py-0.5 rounded-full">
              {TYPE_LABELS[entry.entry_type]}
            </span>
            <h3 className="font-bold text-navy-800 truncate">{entry.title}</h3>
            <PriorityPill p={entry.priority} />
            {entry.extracted && <span className="text-[10px] text-blue-600 font-semibold">AI-segregated</span>}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {entry.reference_no ?? entry.id.slice(0, 8)} · {scope}
            {meta && <> · {meta}</>}
          </div>
          {entry.description && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-3">{entry.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button type="button" onClick={generate} disabled={gen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-60">
            {gen ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            {hasAssets ? 'Regenerate' : 'Generate'}
          </button>
          {hasAssets && (
            <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-amber-700 hover:underline">
              {open ? 'Hide assets' : 'Show assets'}
            </button>
          )}
        </div>
      </div>

      {err && <p className="mt-2 text-xs text-rose-700 inline-flex items-center gap-1"><AlertCircle size={12} /> {err}</p>}

      {open && hasAssets && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-3">
          <Asset label="Short message" text={entry.short_message} />
          <Asset label="WhatsApp" text={entry.whatsapp_text} />
          <Asset label="Social caption"
            text={[entry.social_caption, entry.social_hashtags.map((h) => `#${h}`).join(' ')].filter(Boolean).join('\n\n')} />
          <Asset label="Flyer copy" text={entry.flyer
            ? `${entry.flyer.headline}\n${entry.flyer.subheading}\n\n${entry.flyer.body}\n\n${entry.flyer.cta}` : null} />
          <div className="md:col-span-2">
            <Asset label="Minutes / report" text={entry.minutes} />
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={buildDeck} disabled={deck}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-navy-600 bg-white text-navy-800 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60">
              {deck ? <Loader2 size={13} className="animate-spin" /> : <Presentation size={13} />}
              {entry.presentation_url ? 'Rebuild .pptx' : 'Build presentation (.pptx)'}
            </button>
            {entry.presentation_url && (
              <a href={entry.presentation_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold hover:underline">
                <Download size={13} /> Download deck
              </a>
            )}
            {entry.presentation?.slides?.length ? (
              <span className="text-[11px] text-gray-500">{entry.presentation.slides.length} slides drafted</span>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}

function Asset({ label, text }: { label: string; text: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  function copy() {
    navigator.clipboard?.writeText(text!).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }
  return (
    <div className="border rounded-md bg-gray-50/60">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b bg-white rounded-t-md">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">{label}</span>
        <button type="button" onClick={copy} className="text-gray-400 hover:text-navy-700">
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        </button>
      </div>
      <p className="px-2.5 py-2 text-xs text-gray-700 whitespace-pre-wrap max-h-44 overflow-auto">{text}</p>
    </div>
  );
}

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1.5 border rounded-md text-sm">
        {children}
      </select>
    </label>
  );
}

function PriorityPill({ p }: { p: 'info' | 'important' | 'urgent' }) {
  const cls = p === 'urgent' ? 'bg-rose-100 text-rose-700'
    : p === 'important' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700';
  return <span className={`inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${cls}`}>{p}</span>;
}
