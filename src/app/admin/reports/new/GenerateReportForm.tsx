'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportCatalogEntry } from '@/lib/reports';
import { FileText, Presentation, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Scope = 'month' | 'quarter' | 'half' | 'year';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  catalog: ReportCatalogEntry[];
  initialType: string;
}

export function GenerateReportForm({ catalog, initialType }: Props) {
  const router = useRouter();
  const now = new Date();
  const [type, setType] = useState(initialType);
  const [scope, setScope] = useState<Scope>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [index, setIndex] = useState(now.getMonth());
  const [formats, setFormats] = useState<string[]>(['pdf','pptx']);
  const [aiNarrative, setAiNarrative] = useState(false);
  const [language, setLanguage] = useState<'en'|'gu'|'bilingual'>('en');
  const [tone, setTone] = useState('lions_district');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string; ids?: string[] } | null>(null);

  const groups = useMemo(() => {
    const m = new Map<string, ReportCatalogEntry[]>();
    for (const e of catalog) {
      const arr = m.get(e.group) ?? [];
      arr.push(e); m.set(e.group, arr);
    }
    return m;
  }, [catalog]);

  const yearOptions: number[] = [];
  for (let y = now.getFullYear() + 1; y >= 2020; y--) yearOptions.push(y);

  function toggleFormat(f: string) {
    setFormats((s) => s.includes(f) ? s.filter((x) => x !== f) : [...s, f]);
  }

  function submit() {
    if (!formats.length) {
      setResult({ ok: false, message: 'Select at least one output format.' });
      return;
    }
    setResult(null);
    start(async () => {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, scope, year, index, formats, aiNarrative, language, tone }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, message: j.error ?? 'Generation failed.' });
        return;
      }
      setResult({ ok: true, message: `Generated ${j.count} artifact(s).`, ids: j.ids });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-white"
        >
          {[...groups.entries()].map(([group, entries]) => (
            <optgroup key={group} label={`${group} Reports`}>
              {entries.map((e) => (
                <option key={e.type} value={e.type}>{e.title}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {catalog.find((e) => e.type === type)?.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Period Scope</label>
          <select
            value={scope}
            onChange={(e) => { setScope(e.target.value as Scope); setIndex(0); }}
            className="w-full px-3 py-2 border rounded-md text-sm bg-white"
          >
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="half">Half-Yearly</option>
            <option value="year">Yearly (Lions Year)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-md text-sm bg-white"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
          {scope === 'month' && (
            <select value={index} onChange={(e) => setIndex(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm bg-white">
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          )}
          {scope === 'quarter' && (
            <select value={index} onChange={(e) => setIndex(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm bg-white">
              {[1,2,3,4].map((q) => <option key={q} value={q}>Q{q}</option>)}
            </select>
          )}
          {scope === 'half' && (
            <select value={index} onChange={(e) => setIndex(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm bg-white">
              <option value={1}>H1 (Jan–Jun)</option>
              <option value={2}>H2 (Jul–Dec)</option>
            </select>
          )}
          {scope === 'year' && (
            <div className="px-3 py-2 border rounded-md text-sm bg-gray-50 text-gray-600">
              Lions Year {year}-{String((year + 1) % 100).padStart(2, '0')}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Output Formats</label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => toggleFormat('pdf')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm font-medium transition ${
              formats.includes('pdf')
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
            }`}
          >
            <FileText size={16} /> PDF Document
          </button>
          <button
            type="button"
            onClick={() => toggleFormat('pptx')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm font-medium transition ${
              formats.includes('pptx')
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
            }`}
          >
            <Presentation size={16} /> PowerPoint (PPTX)
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          PDF includes colorful native charts (bar, donut, pie, line, area, stacked).
          PPTX uses native Office charts that are fully editable in PowerPoint / Keynote.
        </p>
      </div>

      <div className="border-t pt-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiNarrative}
            onChange={(e) => setAiNarrative(e.target.checked)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">AI Narrative Writer</span>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 uppercase tracking-wider">
                OpenAI
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Generate executive summary, flagship project, impact and outlook sections automatically.
              Supports English, Gujarati (ગુજરાતી), or bilingual output.
            </p>
          </div>
        </label>

        {aiNarrative && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pl-7">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en'|'gu'|'bilingual')}
                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
              >
                <option value="en">English</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="bilingual">Bilingual (EN + GU)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
              >
                <option value="lions_district">Lions District</option>
                <option value="executive">Executive Briefing</option>
                <option value="board">Board Meeting</option>
                <option value="donor">Donor Stewardship</option>
                <option value="press_release">Press Release</option>
                <option value="social_media">Social Media</option>
                <option value="volunteer_thanks">Volunteer Thanks</option>
                <option value="sponsor_pitch">CSR Sponsor Pitch</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm disabled:opacity-60"
        >
          {pending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
          {pending ? 'Generating…' : 'Generate Report'}
        </button>
        {result && (
          <span className={`inline-flex items-center gap-1.5 text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
            {result.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {result.message}
          </span>
        )}
      </div>
    </div>
  );
}
