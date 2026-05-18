'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, AlertCircle } from 'lucide-react';

export function ServiceLogForm({ beneficiaryId }: { beneficiaryId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('0');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');

  function submit() {
    setError(null);
    if (!serviceType.trim()) { setError('Service type is required'); return; }
    start(async () => {
      const res = await fetch(`/api/beneficiaries/${beneficiaryId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          description,
          value_provided: Number(value) || 0,
          service_date: serviceDate,
          follow_up_required: followUp,
          follow_up_date: followUp ? followUpDate || null : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'Save failed'); return;
      }
      setServiceType(''); setDescription(''); setValue('0'); setFollowUp(false); setFollowUpDate('');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Service Type *">
          <input value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={cls}
            placeholder="e.g. Cataract surgery sponsorship" />
        </Field>
        <Field label="Date">
          <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className={cls} />
        </Field>
        <Field label="Value Provided (INR)">
          <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className={cls} />
        </Field>
        <Field label="Follow-up Required?">
          <label className="inline-flex items-center gap-2 mt-2">
            <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
            <span className="text-sm">Schedule a follow-up</span>
          </label>
        </Field>
        {followUp && (
          <Field label="Follow-up Date">
            <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={cls} />
          </Field>
        )}
      </div>
      <Field label="Description">
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={cls} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={submit} disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
          Log Service
        </button>
        {error && <span className="inline-flex items-center gap-1 text-sm text-red-700"><AlertCircle size={14} /> {error}</span>}
      </div>
    </div>
  );
}

const cls = 'w-full px-3 py-2 border rounded-md text-sm';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
