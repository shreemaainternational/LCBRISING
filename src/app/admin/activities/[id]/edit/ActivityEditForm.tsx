'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, Save, AlertCircle, CheckCircle2, ArrowLeft, ImagePlus,
} from 'lucide-react';
import { PhotoMultiUpload } from '@/components/admin/PhotoMultiUpload';

const CATEGORIES = [
  'vision', 'hunger', 'environment', 'diabetes', 'childhood_cancer',
  'humanitarian', 'youth', 'education', 'healthcare', 'women', 'senior',
  'meeting', 'leadership_program', 'event', 'other',
];

const STATUSES = ['completed', 'in_progress', 'planned', 'cancelled'];

export interface ActivityInitial {
  id: string;
  title: string;
  category: string | null;
  date: string;
  location: string | null;
  description: string | null;
  status: string | null;
  beneficiaries: number | null;
  service_hours: number | null;
  lion_members_count: number | null;
  leo_members_count: number | null;
  guest_count: number | null;
  amount_raised: number | null;
  budget: number | null;
  expenses: number | null;
  sponsorship_amount: number | null;
  photos: string[];
  before_photos: string[];
  after_photos: string[];
  videos: string[];
  photo_captions: Record<string, string>;
}

export function ActivityEditForm({ initial }: { initial: ActivityInitial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [title, setTitle] = useState(initial.title ?? '');
  const [category, setCategory] = useState(initial.category ?? 'other');
  const [date, setDate] = useState((initial.date ?? '').slice(0, 10));
  const [location, setLocation] = useState(initial.location ?? '');
  const [status, setStatus] = useState(initial.status ?? 'completed');
  const [description, setDescription] = useState(initial.description ?? '');

  const [beneficiaries, setBeneficiaries] = useState(String(initial.beneficiaries ?? 0));
  const [hours, setHours] = useState(String(initial.service_hours ?? 0));
  const [lions, setLions] = useState(String(initial.lion_members_count ?? 0));
  const [leos, setLeos] = useState(String(initial.leo_members_count ?? 0));
  const [guests, setGuests] = useState(String(initial.guest_count ?? 0));
  const [funds, setFunds] = useState(String(initial.amount_raised ?? 0));
  const [budget, setBudget] = useState(String(initial.budget ?? 0));
  const [expenses, setExpenses] = useState(String(initial.expenses ?? 0));
  const [sponsorship, setSponsorship] = useState(String(initial.sponsorship_amount ?? 0));

  const [photos, setPhotos] = useState<string[]>(initial.photos ?? []);
  const [before, setBefore] = useState<string[]>(initial.before_photos ?? []);
  const [after, setAfter] = useState<string[]>(initial.after_photos ?? []);
  const [videos, setVideos] = useState<string[]>(initial.videos ?? []);
  const [captions, setCaptions] = useState<Record<string, string>>(initial.photo_captions ?? {});

  function mergeCaptions(map: Record<string, string>) {
    setCaptions((cur) => ({ ...cur, ...map }));
  }

  function submit() {
    setError(null); setOk(false);
    if (title.trim().length < 3) { setError('Title needs at least 3 characters'); return; }

    // Keep only captions whose photo still exists in one of the galleries.
    const liveUrls = new Set([...photos, ...before, ...after, ...videos]);
    const cleanCaptions: Record<string, string> = {};
    for (const [url, cap] of Object.entries(captions)) {
      if (liveUrls.has(url) && cap) cleanCaptions[url] = cap;
    }

    start(async () => {
      const res = await fetch(`/api/activities/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          date,
          location: location.trim(),
          description: description.trim(),
          status,
          beneficiaries: Number(beneficiaries) || 0,
          service_hours: Number(hours) || 0,
          lion_members_count: Number(lions) || 0,
          leo_members_count: Number(leos) || 0,
          guest_count: Number(guests) || 0,
          amount_raised: Number(funds) || 0,
          budget: Number(budget) || 0,
          expenses: Number(expenses) || 0,
          sponsorship_amount: Number(sponsorship) || 0,
          photos,
          before_photos: before,
          after_photos: after,
          videos,
          photo_captions: cleanCaptions,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Save failed'); return; }
      setOk(true);
      router.refresh();
      setTimeout(() => router.push(`/admin/activities/${initial.id}`), 700);
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={`/admin/activities/${initial.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800"
      >
        <ArrowLeft size={14} /> Back to activity
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1">Edit Activity</h1>
        <p className="text-gray-600">Correct details and add or manage photos.</p>
      </div>

      {/* Core details */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="Activity title" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={input} placeholder="Venue / address" />
        </Field>

        <Field label="Description">
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={input}
            placeholder="What did the team do? Notable moments?" />
        </Field>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Impact &amp; Members</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Beneficiaries">
            <input type="number" min={0} inputMode="numeric" value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} className={input} />
          </Field>
          <Field label="Service Hours">
            <input type="number" min={0} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} className={input} />
          </Field>
          <Field label="Lion Members">
            <input type="number" min={0} inputMode="numeric" value={lions} onChange={(e) => setLions(e.target.value)} className={input} />
          </Field>
          <Field label="Leo Members">
            <input type="number" min={0} inputMode="numeric" value={leos} onChange={(e) => setLeos(e.target.value)} className={input} />
          </Field>
          <Field label="Guests">
            <input type="number" min={0} inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value)} className={input} />
          </Field>
        </div>
      </div>

      {/* Financials */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Financials (₹)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Funds Raised">
            <input type="number" min={0} inputMode="decimal" value={funds} onChange={(e) => setFunds(e.target.value)} className={input} />
          </Field>
          <Field label="Budget">
            <input type="number" min={0} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className={input} />
          </Field>
          <Field label="Expenses">
            <input type="number" min={0} inputMode="decimal" value={expenses} onChange={(e) => setExpenses(e.target.value)} className={input} />
          </Field>
          <Field label="CSR Sponsorship">
            <input type="number" min={0} inputMode="decimal" value={sponsorship} onChange={(e) => setSponsorship(e.target.value)} className={input} />
          </Field>
        </div>
      </div>

      {/* Media */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
        <div className="flex items-center gap-2">
          <ImagePlus size={16} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Photos &amp; Media</h2>
        </div>

        <div className="rounded-xl border border-blue-200 p-3">
          <PhotoMultiUpload
            value={photos}
            onChange={setPhotos}
            onCaptionsChange={mergeCaptions}
            initialCaptions={captions}
            folder="activities"
            minRecommended={6}
            max={30}
            label="Project photos"
            hint="Add photos of the activity — before, during and after. Drag to reorder; the first is the cover."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-amber-200 p-3">
            <PhotoMultiUpload
              value={before}
              onChange={setBefore}
              onCaptionsChange={mergeCaptions}
              initialCaptions={captions}
              folder="activities/before"
              minRecommended={0}
              max={20}
              accept="image/*"
              label="Before photos"
              hint="Optional — photos taken before the activity."
            />
          </div>
          <div className="rounded-xl border border-emerald-200 p-3">
            <PhotoMultiUpload
              value={after}
              onChange={setAfter}
              onCaptionsChange={mergeCaptions}
              initialCaptions={captions}
              folder="activities/after"
              minRecommended={0}
              max={20}
              accept="image/*"
              label="After photos"
              hint="Optional — photos taken after the activity."
            />
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 p-3">
          <PhotoMultiUpload
            value={videos}
            onChange={setVideos}
            folder="activities/videos"
            minRecommended={0}
            max={10}
            accept="video/mp4,video/quicktime,video/webm"
            label="Videos"
            hint="Optional — short clips (MP4/WebM)."
            showCaptions={false}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur border-t flex items-center gap-3">
        <button type="button" onClick={submit} disabled={pending}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-800 text-white font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <Link href={`/admin/activities/${initial.id}`}
          className="px-4 py-3 rounded-xl border text-sm text-gray-600 hover:bg-white">
          Cancel
        </Link>
        {error && (
          <span className="inline-flex items-center gap-1 text-xs text-red-700">
            <AlertCircle size={12} /> {error}
          </span>
        )}
        {ok && (
          <span className="inline-flex items-center gap-1 text-xs text-green-700">
            <CheckCircle2 size={12} /> Saved — redirecting…
          </span>
        )}
      </div>
    </div>
  );
}

const input = 'w-full px-3 py-2.5 border rounded-lg text-sm bg-white';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">{label}</span>
      {children}
    </label>
  );
}
