'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, Loader2, Sparkles } from 'lucide-react';
import { CLUB_MEETING_TYPES, type ClubMeetingType } from '@/templates/meeting-agenda';

type Kind = 'club' | 'zone';

type ApiResult = {
  ok?: boolean;
  markdown?: string;
  source?: 'ai' | 'template';
  ai_error?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; cost_usd: number };
  error?: string;
};

const CLUB_DEFAULTS = {
  club_name: 'Lions Club of Baroda Rising Star',
  district_name: 'District 3232 F1',
  region: '1',
  zone: '1',
  meeting_type: 'Board Meeting' as ClubMeetingType,
  meeting_date: '',
  meeting_time: '18:00',
  venue: 'Hotel Surya Palace, Vadodara',
  president_name: '',
  secretary_name: '',
  treasurer_name: '',
  chief_guest: '',
  meeting_theme: 'We Serve — driving measurable community impact',
  service_focus: '',
  membership_target: '',
  upcoming_projects: '',
  financial_review: '',
  digital_reporting: '',
  awards_recognition: '',
  sponsorship_topics: '',
  csr_activities: '',
  emergency_matters: '',
  lions_intl_updates: '',
};

const ZONE_DEFAULTS = {
  district_name: 'District 3232 F1',
  region_number: '1',
  zone_number: '1',
  zone_chairperson: '',
  region_chairperson: '',
  district_governor: '',
  meeting_date: '',
  meeting_time: '10:00',
  venue: '',
  host_club: 'Lions Club of Baroda Rising Star',
  participating_clubs: '',
  chief_guest: '',
  meeting_theme: 'Strengthening Service, Standardising Reporting',
  membership_targets: '',
  service_targets: '',
  lcif_goals: '',
  leadership_topics: '',
  reporting_topics: '',
  training_topics: '',
  digital_topics: '',
  awards_recognition: '',
  club_performance_notes: '',
  upcoming_district_events: '',
};

export function MeetingAgendaStudio({ actorName }: { actorName: string }) {
  const [kind, setKind] = useState<Kind>('club');
  const [club, setClub] = useState({ ...CLUB_DEFAULTS, president_name: actorName });
  const [zone, setZone] = useState({ ...ZONE_DEFAULTS, zone_chairperson: actorName });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  const filename = useMemo(() => {
    const date = kind === 'club' ? club.meeting_date : zone.meeting_date;
    const safe = (s: string) => s.replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'agenda';
    return kind === 'club'
      ? `agenda_${safe(club.club_name)}_${safe(date || 'tbd')}.md`
      : `agenda_zone${safe(zone.zone_number)}_${safe(zone.district_name)}_${safe(date || 'tbd')}.md`;
  }, [kind, club.club_name, club.meeting_date, zone.zone_number, zone.district_name, zone.meeting_date]);

  async function onGenerate() {
    setLoading(true);
    setResult(null);
    try {
      const body = kind === 'club' ? { kind, ...club } : { kind, ...zone };
      const res = await fetch('/api/admin/meeting-agenda', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResult;
      setResult(json);
    } catch (e) {
      setResult({ error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function onCopy() {
    if (!result?.markdown) return;
    void navigator.clipboard.writeText(result.markdown);
  }

  function onDownload() {
    if (!result?.markdown) return;
    const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
        {(['club', 'zone'] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`px-4 py-2 rounded-md font-medium transition ${
              kind === k ? 'bg-navy-800 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {k === 'club' ? 'Club Meeting' : 'Zone Meeting'}
          </button>
        ))}
      </div>

      {kind === 'club' ? (
        <ClubForm value={club} onChange={setClub} />
      ) : (
        <ZoneForm value={zone} onChange={setZone} />
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="btn-gold inline-flex h-11 px-5 rounded-md items-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Generating…' : 'Generate Agenda'}
        </button>
        {result?.source && (
          <span className="text-xs text-gray-600">
            Source: <strong>{result.source === 'ai' ? 'AI (OpenAI)' : 'template fallback'}</strong>
            {result.usage && result.source === 'ai'
              ? ` · ${result.usage.prompt_tokens}+${result.usage.completion_tokens} tokens · $${result.usage.cost_usd.toFixed(4)}`
              : ''}
          </span>
        )}
      </div>

      {result?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {result.error}
        </div>
      )}
      {result?.ai_error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          AI call failed — using template fallback. Detail: {result.ai_error}
        </div>
      )}

      {result?.markdown && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 bg-gray-50">
            <div className="text-sm font-semibold text-navy-800">Generated Agenda (Markdown)</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50"
              >
                <Copy size={12} /> Copy
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50"
              >
                <Download size={12} /> Download .md
              </button>
            </div>
          </div>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap p-4 max-h-[60vh] overflow-y-auto font-mono">
            {result.markdown}
          </pre>
        </div>
      )}
    </div>
  );
}

// ---- Forms --------------------------------------------------------

type ClubForm = typeof CLUB_DEFAULTS;
type ZoneForm = typeof ZONE_DEFAULTS;

function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: 1 | 2 | 3 }) {
  const cls = span === 3 ? 'md:col-span-3' : span === 2 ? 'md:col-span-2' : '';
  return (
    <label className={`flex flex-col gap-1 text-sm ${cls}`}>
      <span className="font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400';

function ClubForm({ value, onChange }: { value: ClubForm; onChange: (v: ClubForm) => void }) {
  const set = <K extends keyof ClubForm>(k: K, v: ClubForm[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Field label="Club Name" span={2}>
        <input className={inputClass} value={value.club_name} onChange={(e) => set('club_name', e.target.value)} />
      </Field>
      <Field label="District">
        <input className={inputClass} value={value.district_name} onChange={(e) => set('district_name', e.target.value)} />
      </Field>
      <Field label="Region">
        <input className={inputClass} value={value.region} onChange={(e) => set('region', e.target.value)} />
      </Field>
      <Field label="Zone">
        <input className={inputClass} value={value.zone} onChange={(e) => set('zone', e.target.value)} />
      </Field>
      <Field label="Meeting Type">
        <select
          className={inputClass}
          value={value.meeting_type}
          onChange={(e) => set('meeting_type', e.target.value as ClubMeetingType)}
        >
          {CLUB_MEETING_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Meeting Date">
        <input type="date" className={inputClass} value={value.meeting_date} onChange={(e) => set('meeting_date', e.target.value)} />
      </Field>
      <Field label="Meeting Time">
        <input type="time" className={inputClass} value={value.meeting_time} onChange={(e) => set('meeting_time', e.target.value)} />
      </Field>
      <Field label="Venue" span={3}>
        <input className={inputClass} value={value.venue} onChange={(e) => set('venue', e.target.value)} />
      </Field>
      <Field label="President">
        <input className={inputClass} value={value.president_name} onChange={(e) => set('president_name', e.target.value)} />
      </Field>
      <Field label="Secretary">
        <input className={inputClass} value={value.secretary_name} onChange={(e) => set('secretary_name', e.target.value)} />
      </Field>
      <Field label="Treasurer">
        <input className={inputClass} value={value.treasurer_name} onChange={(e) => set('treasurer_name', e.target.value)} />
      </Field>
      <Field label="Chief Guest / Guest Speaker" span={3}>
        <input className={inputClass} value={value.chief_guest} onChange={(e) => set('chief_guest', e.target.value)} />
      </Field>
      <Field label="Meeting Theme" span={3}>
        <input className={inputClass} value={value.meeting_theme} onChange={(e) => set('meeting_theme', e.target.value)} />
      </Field>
      <Field label="Service Focus Area" span={2}>
        <input className={inputClass} value={value.service_focus} onChange={(e) => set('service_focus', e.target.value)} />
      </Field>
      <Field label="Membership Target">
        <input className={inputClass} value={value.membership_target} onChange={(e) => set('membership_target', e.target.value)} placeholder="e.g. +5 by Q3" />
      </Field>
      <Field label="Upcoming Projects" span={3}>
        <textarea rows={2} className={inputClass} value={value.upcoming_projects} onChange={(e) => set('upcoming_projects', e.target.value)} />
      </Field>
      <Field label="Financial Review Topics" span={3}>
        <textarea rows={2} className={inputClass} value={value.financial_review} onChange={(e) => set('financial_review', e.target.value)} />
      </Field>
      <Field label="Digital Reporting Topics" span={3}>
        <textarea rows={2} className={inputClass} value={value.digital_reporting} onChange={(e) => set('digital_reporting', e.target.value)} />
      </Field>
      <Field label="Awards & Recognition">
        <input className={inputClass} value={value.awards_recognition} onChange={(e) => set('awards_recognition', e.target.value)} />
      </Field>
      <Field label="Sponsorship Discussion">
        <input className={inputClass} value={value.sponsorship_topics} onChange={(e) => set('sponsorship_topics', e.target.value)} />
      </Field>
      <Field label="CSR Activities">
        <input className={inputClass} value={value.csr_activities} onChange={(e) => set('csr_activities', e.target.value)} />
      </Field>
      <Field label="Emergency Matters" span={2}>
        <input className={inputClass} value={value.emergency_matters} onChange={(e) => set('emergency_matters', e.target.value)} />
      </Field>
      <Field label="Lions International Reporting Updates">
        <input className={inputClass} value={value.lions_intl_updates} onChange={(e) => set('lions_intl_updates', e.target.value)} />
      </Field>
    </div>
  );
}

function ZoneForm({ value, onChange }: { value: ZoneForm; onChange: (v: ZoneForm) => void }) {
  const set = <K extends keyof ZoneForm>(k: K, v: ZoneForm[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Field label="District" span={2}>
        <input className={inputClass} value={value.district_name} onChange={(e) => set('district_name', e.target.value)} />
      </Field>
      <Field label="Region Number">
        <input className={inputClass} value={value.region_number} onChange={(e) => set('region_number', e.target.value)} />
      </Field>
      <Field label="Zone Number">
        <input className={inputClass} value={value.zone_number} onChange={(e) => set('zone_number', e.target.value)} />
      </Field>
      <Field label="Zone Chairperson">
        <input className={inputClass} value={value.zone_chairperson} onChange={(e) => set('zone_chairperson', e.target.value)} />
      </Field>
      <Field label="Region Chairperson">
        <input className={inputClass} value={value.region_chairperson} onChange={(e) => set('region_chairperson', e.target.value)} />
      </Field>
      <Field label="District Governor" span={3}>
        <input className={inputClass} value={value.district_governor} onChange={(e) => set('district_governor', e.target.value)} />
      </Field>
      <Field label="Meeting Date">
        <input type="date" className={inputClass} value={value.meeting_date} onChange={(e) => set('meeting_date', e.target.value)} />
      </Field>
      <Field label="Meeting Time">
        <input type="time" className={inputClass} value={value.meeting_time} onChange={(e) => set('meeting_time', e.target.value)} />
      </Field>
      <Field label="Host Club">
        <input className={inputClass} value={value.host_club} onChange={(e) => set('host_club', e.target.value)} />
      </Field>
      <Field label="Venue" span={3}>
        <input className={inputClass} value={value.venue} onChange={(e) => set('venue', e.target.value)} />
      </Field>
      <Field label="Participating Clubs (comma separated)" span={3}>
        <textarea
          rows={2}
          className={inputClass}
          value={value.participating_clubs}
          onChange={(e) => set('participating_clubs', e.target.value)}
          placeholder="Lions Club of Baroda Rising Star, Lions Club of …"
        />
      </Field>
      <Field label="Chief Guest / Dignitaries" span={3}>
        <input className={inputClass} value={value.chief_guest} onChange={(e) => set('chief_guest', e.target.value)} />
      </Field>
      <Field label="Meeting Theme" span={3}>
        <input className={inputClass} value={value.meeting_theme} onChange={(e) => set('meeting_theme', e.target.value)} />
      </Field>
      <Field label="Membership Targets">
        <input className={inputClass} value={value.membership_targets} onChange={(e) => set('membership_targets', e.target.value)} />
      </Field>
      <Field label="Service Targets">
        <input className={inputClass} value={value.service_targets} onChange={(e) => set('service_targets', e.target.value)} />
      </Field>
      <Field label="LCIF Goals">
        <input className={inputClass} value={value.lcif_goals} onChange={(e) => set('lcif_goals', e.target.value)} />
      </Field>
      <Field label="Leadership Development Topics" span={3}>
        <textarea rows={2} className={inputClass} value={value.leadership_topics} onChange={(e) => set('leadership_topics', e.target.value)} />
      </Field>
      <Field label="Reporting Compliance Topics" span={3}>
        <textarea rows={2} className={inputClass} value={value.reporting_topics} onChange={(e) => set('reporting_topics', e.target.value)} />
      </Field>
      <Field label="Training Topics" span={3}>
        <textarea rows={2} className={inputClass} value={value.training_topics} onChange={(e) => set('training_topics', e.target.value)} />
      </Field>
      <Field label="Digital Transformation Topics" span={3}>
        <textarea rows={2} className={inputClass} value={value.digital_topics} onChange={(e) => set('digital_topics', e.target.value)} />
      </Field>
      <Field label="Awards & Recognition" span={3}>
        <input className={inputClass} value={value.awards_recognition} onChange={(e) => set('awards_recognition', e.target.value)} />
      </Field>
      <Field label="Club Performance Notes" span={3}>
        <textarea rows={2} className={inputClass} value={value.club_performance_notes} onChange={(e) => set('club_performance_notes', e.target.value)} />
      </Field>
      <Field label="Upcoming District Events" span={3}>
        <textarea rows={2} className={inputClass} value={value.upcoming_district_events} onChange={(e) => set('upcoming_district_events', e.target.value)} />
      </Field>
    </div>
  );
}
