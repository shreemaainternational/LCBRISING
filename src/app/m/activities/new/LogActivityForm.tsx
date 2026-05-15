'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';

const CATEGORIES = [
  'vision', 'hunger', 'environment', 'diabetes', 'childhood_cancer',
  'humanitarian', 'youth', 'education', 'healthcare', 'women', 'senior', 'other',
];

export function LogActivityForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('healthcare');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [beneficiaries, setBeneficiaries] = useState('0');
  const [hours, setHours] = useState('0');
  const [lions, setLions] = useState('0');
  const [funds, setFunds] = useState('0');
  const [description, setDescription] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  function captureGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Location permission denied'),
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 5_000 },
    );
  }

  function submit() {
    setError(null); setOk(false);
    if (title.trim().length < 3) { setError('Title needs at least 3 characters'); return; }
    start(async () => {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, category, date,
          location: location || undefined,
          beneficiaries: Number(beneficiaries) || 0,
          service_hours: Number(hours) || 0,
          amount_raised: Number(funds) || 0,
          description: description || undefined,
          photos: [],
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Save failed'); return; }
      setOk(true);
      // Best-effort: attach Lions count, GPS, etc. on second pass since
      // those columns aren't in the base activitySchema yet.
      try {
        if (j.activity?.id && (Number(lions) || gps)) {
          await fetch(`/api/activities/${j.activity.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lion_members_count: Number(lions) || 0,
              gps_lat: gps?.lat, gps_lng: gps?.lng,
            }),
          });
        }
      } catch { /* ignore */ }
      setTimeout(() => router.push(`/m/activities`), 700);
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="e.g. Eye Camp at SSG Hospital" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Location">
        <div className="flex gap-2">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={input} placeholder="Venue / address" />
          <button type="button" onClick={captureGps}
            className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 inline-flex items-center gap-1 text-sm font-medium">
            <MapPin size={14} /> GPS
          </button>
        </div>
        {gps && <p className="text-[11px] text-gray-500 mt-1">📍 {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Beneficiaries">
          <input type="number" min={0} inputMode="numeric" value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} className={input} />
        </Field>
        <Field label="Service Hours">
          <input type="number" min={0} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} className={input} />
        </Field>
        <Field label="Lions Members">
          <input type="number" min={0} inputMode="numeric" value={lions} onChange={(e) => setLions(e.target.value)} className={input} />
        </Field>
        <Field label="Funds Raised (₹)">
          <input type="number" min={0} inputMode="decimal" value={funds} onChange={(e) => setFunds(e.target.value)} className={input} />
        </Field>
      </div>

      <Field label="Description">
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={input}
          placeholder="What did the team do? Notable moments?" />
      </Field>

      <div className="sticky bottom-24 -mx-4 px-4 pt-2 pb-3 bg-gray-50/95 backdrop-blur border-t">
        <button type="button" onClick={submit} disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500 active:bg-amber-600 text-white font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {pending ? 'Saving…' : 'Save Activity'}
        </button>
        {error && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-red-700 px-2">
            <AlertCircle size={12} /> {error}
          </div>
        )}
        {ok && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 px-2">
            <CheckCircle2 size={12} /> Saved — redirecting…
          </div>
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
