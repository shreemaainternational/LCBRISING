'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, AlertCircle, CheckCircle2, MapPin, ScanLine } from 'lucide-react';
import { PhotoMultiUpload } from '@/components/admin/PhotoMultiUpload';
import { ACTIVITY_CATEGORY_OPTIONS } from '@/lib/activity-categories';

/** Local "YYYY-MM-DDTHH:mm" string suitable for a datetime-local input. */
function nowLocalInput() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function LogActivityForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('healthcare');
  const [startAt, setStartAt] = useState(nowLocalInput());
  const [endAt, setEndAt] = useState('');
  const [location, setLocation] = useState('');
  const [beneficiaries, setBeneficiaries] = useState('0');
  const [hours, setHours] = useState('0');
  const [lions, setLions] = useState('0');
  const [funds, setFunds] = useState('0');
  const [description, setDescription] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [expenses, setExpenses] = useState('0');
  const [budget, setBudget] = useState('0');
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  async function scanBill(file: File) {
    setOcrNotice(null);
    setOcrPending(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ai/ocr/bill', { method: 'POST', body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setOcrNotice(j.error === 'ocr_failed_or_not_configured' ? 'Enable OPENAI_API_KEY for bill OCR' : 'Could not read bill'); return; }
      const r = j.result as { merchant_name?: string; total?: number; invoice_date?: string; notes?: string; confidence?: string };
      if (r.total) setExpenses(String(r.total));
      if (r.invoice_date) setStartAt((prev) => `${r.invoice_date}T${prev.slice(11) || '09:00'}`);
      if (r.merchant_name) {
        setDescription((d) => d ? d : `Expense bill from ${r.merchant_name}${r.notes ? ` — ${r.notes}` : ''}`);
      }
      setOcrNotice(`Scanned ${r.merchant_name ?? 'bill'} · ₹${r.total ?? '?'} (${r.confidence ?? 'low'} confidence)`);
    } catch (e) {
      setOcrNotice(`Scan failed: ${String(e)}`);
    } finally {
      setOcrPending(false);
    }
  }

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
    if (!startAt) { setError('Please pick a start date and time'); return; }
    if (endAt && endAt < startAt) { setError('End must be after the start'); return; }
    start(async () => {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, category,
          date: startAt.slice(0, 10),
          location: location || undefined,
          beneficiaries: Number(beneficiaries) || 0,
          service_hours: Number(hours) || 0,
          amount_raised: Number(funds) || 0,
          description: description || undefined,
          photos,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Save failed'); return; }
      setOk(true);
      // Best-effort: attach Lions count, GPS, expenses on a second
      // pass since those columns aren't in the base activitySchema.
      try {
        if (j.activity?.id && (Number(lions) || gps || Number(expenses) || Number(budget))) {
          await fetch(`/api/activities/${j.activity.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lion_members_count: Number(lions) || 0,
              gps_lat: gps?.lat, gps_lng: gps?.lng,
              expenses: Number(expenses) || 0,
              budget: Number(budget) || 0,
            }),
          });
        }
      } catch { /* ignore */ }
      // Best-effort: attach precise start/end timestamps in a separate pass so
      // a not-yet-applied migration can't drop the extended fields above.
      try {
        if (j.activity?.id && startAt) {
          await fetch(`/api/activities/${j.activity.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start_at: new Date(startAt).toISOString(),
              end_at: endAt ? new Date(endAt).toISOString() : null,
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
        <Field label="Starts">
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={input} />
        </Field>
        <Field label="Ends">
          <input type="datetime-local" value={endAt} min={startAt} onChange={(e) => setEndAt(e.target.value)} className={input} />
        </Field>
      </div>

      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
          {ACTIVITY_CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </Field>

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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Budget (₹)">
          <input type="number" min={0} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className={input} />
        </Field>
        <Field label="Expenses (₹)">
          <input type="number" min={0} inputMode="decimal" value={expenses} onChange={(e) => setExpenses(e.target.value)} className={input} />
        </Field>
      </div>

      <div className="rounded-xl border border-dashed border-purple-300 bg-purple-50/40 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
            Scan expense bill
          </div>
          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI OCR</span>
        </div>
        <p className="text-[11px] text-purple-700/80 mb-2">
          Take a photo of a receipt or upload one. OpenAI vision will read merchant,
          total and date and fill the fields above.
        </p>
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium cursor-pointer w-full justify-center">
          {ocrPending ? <Loader2 className="animate-spin" size={14} /> : <ScanLine size={14} />}
          {ocrPending ? 'Reading bill…' : 'Capture / Upload Bill'}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            disabled={ocrPending}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void scanBill(f); }} />
        </label>
        {ocrNotice && (
          <p className="text-[11px] text-purple-700 mt-2">{ocrNotice}</p>
        )}
      </div>

      <div className="rounded-xl border border-blue-200 bg-white p-3">
        <PhotoMultiUpload
          value={photos}
          onChange={setPhotos}
          folder="activities"
          minRecommended={6}
          max={20}
          label="Project photos"
          hint="Upload at least 6 photos — before, during, after. Use the rear camera on your phone."
        />
      </div>

      <Field label="Description">
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={input}
          placeholder="What did the team do? Notable moments?" />
      </Field>

      <div className="sticky bottom-24 -mx-4 px-4 pt-2 pb-3 bg-gray-50/95 backdrop-blur border-t">
        <button type="button" onClick={submit} disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-800 active:bg-blue-800 text-white font-semibold disabled:opacity-60">
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
