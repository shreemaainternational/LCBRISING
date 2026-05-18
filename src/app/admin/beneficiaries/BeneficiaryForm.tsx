'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BeneficiaryInit {
  id?: string;
  full_name?: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  aadhaar_last4?: string | null;
  income_category?: string | null;
  household_size?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  family_head?: string | null;
  emergency_contact?: string | null;
  notes?: string | null;
}

interface Props {
  mode: 'create' | 'edit';
  initial?: BeneficiaryInit;
}

export function BeneficiaryForm({ mode, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [form, setForm] = useState<BeneficiaryInit>({
    full_name: initial?.full_name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    gender: initial?.gender ?? '',
    age: initial?.age ?? null,
    date_of_birth: initial?.date_of_birth ?? '',
    aadhaar_last4: initial?.aadhaar_last4 ?? '',
    income_category: initial?.income_category ?? '',
    household_size: initial?.household_size ?? null,
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? 'Gujarat',
    pincode: initial?.pincode ?? '',
    family_head: initial?.family_head ?? '',
    emergency_contact: initial?.emergency_contact ?? '',
    notes: initial?.notes ?? '',
  });

  function up<K extends keyof BeneficiaryInit>(k: K, v: BeneficiaryInit[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function submit() {
    setError(null); setOk(false);
    if (!form.full_name?.trim()) { setError('Name is required'); return; }
    start(async () => {
      const url = mode === 'create' ? '/api/beneficiaries' : `/api/beneficiaries/${initial?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : null,
        household_size: form.household_size ? Number(form.household_size) : null,
      };
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Save failed'); return; }
      setOk(true);
      if (mode === 'create') router.push(`/admin/beneficiaries/${j.beneficiary.id}`);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Section title="Identity">
        <Grid>
          <Field label="Full Name *">
            <input className={inputCls} value={form.full_name ?? ''} onChange={(e) => up('full_name', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone ?? ''} onChange={(e) => up('phone', e.target.value)} placeholder="+91…" />
          </Field>
          <Field label="Email">
            <input type="email" className={inputCls} value={form.email ?? ''} onChange={(e) => up('email', e.target.value)} />
          </Field>
          <Field label="Aadhaar (last 4)">
            <input maxLength={4} className={inputCls} value={form.aadhaar_last4 ?? ''} onChange={(e) => up('aadhaar_last4', e.target.value)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Demographics">
        <Grid>
          <Field label="Gender">
            <select className={inputCls} value={form.gender ?? ''} onChange={(e) => up('gender', e.target.value)}>
              <option value="">—</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="undisclosed">Undisclosed</option>
            </select>
          </Field>
          <Field label="Age">
            <input type="number" min={0} max={120} className={inputCls} value={form.age ?? ''} onChange={(e) => up('age', e.target.value === '' ? null : Number(e.target.value))} />
          </Field>
          <Field label="Date of Birth">
            <input type="date" className={inputCls} value={form.date_of_birth ?? ''} onChange={(e) => up('date_of_birth', e.target.value)} />
          </Field>
          <Field label="Income Category">
            <select className={inputCls} value={form.income_category ?? ''} onChange={(e) => up('income_category', e.target.value)}>
              <option value="">—</option>
              <option value="BPL">Below Poverty Line</option>
              <option value="LIG">Low Income Group</option>
              <option value="MIG">Middle Income Group</option>
              <option value="HIG">High Income Group</option>
            </select>
          </Field>
          <Field label="Household Size">
            <input type="number" min={0} className={inputCls} value={form.household_size ?? ''} onChange={(e) => up('household_size', e.target.value === '' ? null : Number(e.target.value))} />
          </Field>
          <Field label="Family Head">
            <input className={inputCls} value={form.family_head ?? ''} onChange={(e) => up('family_head', e.target.value)} />
          </Field>
        </Grid>
      </Section>

      <Section title="Address">
        <div className="space-y-3">
          <Field label="Street Address">
            <textarea rows={2} className={inputCls} value={form.address ?? ''} onChange={(e) => up('address', e.target.value)} />
          </Field>
          <Grid>
            <Field label="City"><input className={inputCls} value={form.city ?? ''} onChange={(e) => up('city', e.target.value)} /></Field>
            <Field label="State"><input className={inputCls} value={form.state ?? ''} onChange={(e) => up('state', e.target.value)} /></Field>
            <Field label="Pincode"><input className={inputCls} value={form.pincode ?? ''} onChange={(e) => up('pincode', e.target.value)} /></Field>
            <Field label="Emergency Contact"><input className={inputCls} value={form.emergency_contact ?? ''} onChange={(e) => up('emergency_contact', e.target.value)} /></Field>
          </Grid>
        </div>
      </Section>

      <Section title="Notes">
        <Field label="Internal notes">
          <textarea rows={3} className={inputCls} value={form.notes ?? ''} onChange={(e) => up('notes', e.target.value)} />
        </Field>
      </Section>

      <div className="flex items-center gap-3 pt-3 border-t">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm disabled:opacity-60"
        >
          {pending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {pending ? 'Saving…' : mode === 'create' ? 'Create Beneficiary' : 'Save Changes'}
        </button>
        {error && <span className="inline-flex items-center gap-1.5 text-sm text-red-700"><AlertCircle size={14} /> {error}</span>}
        {ok && <span className="inline-flex items-center gap-1.5 text-sm text-green-700"><CheckCircle2 size={14} /> Saved.</span>}
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border rounded-md text-sm';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
