'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Save, ExternalLink } from 'lucide-react';

export type CampaignForm = {
  id?: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  goal_amount: number;
  hero_image: string;
  impact_metric: string;
  urgency: '' | 'normal' | 'urgent' | 'emergency';
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_featured: boolean;
  match_campaign: boolean;
};

const CATEGORIES = [
  'Vision', 'Hunger Relief', 'Environment', 'Childhood Cancer', 'Diabetes',
  'Disaster Relief', 'Youth', 'Education', 'Humanitarian',
];

export function CampaignEditor({ initial }: { initial: CampaignForm }) {
  const router = useRouter();
  const [form, setForm] = useState<CampaignForm>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setError(null);
    const res = await fetch('/api/admin/campaigns', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Save failed');
      return;
    }
    setSaved(true);
    startTransition(() => {
      if (!form.id && json.id) {
        router.replace(`/admin/campaigns/${json.id}`);
      } else {
        if (json.slug) setForm((f) => ({ ...f, slug: json.slug }));
        router.refresh();
      }
    });
  }

  const slugChanged = !!initial.id && form.slug !== initial.slug;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-5">
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. Free cataract surgeries — Karelibaug camp"
            className="w-full h-12 px-3 rounded-md border border-gray-300 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Slug (used to tag donations)">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              placeholder="auto-generated-from-title"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm font-mono"
            />
            {slugChanged && (
              <p className="mt-1 text-xs text-amber-700">
                Donations already made are tagged with the old slug and will stop counting toward this
                campaign if you change it.
              </p>
            )}
          </Field>
          <Field label="Hero image URL">
            <input
              type="url"
              value={form.hero_image}
              onChange={(e) => update('hero_image', e.target.value)}
              placeholder="https://…/hero.jpg"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
        </div>

        <Field label="Tagline (one line shown on cards)">
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => update('tagline', e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={6}
            placeholder="What the money funds, who benefits, and how progress will be reported."
            className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <Field label="Impact metric (optional, real target)">
          <input
            type="text"
            value={form.impact_metric}
            onChange={(e) => update('impact_metric', e.target.value)}
            placeholder="e.g. ₹2,000 funds one cataract surgery"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
          />
        </Field>
      </div>

      <aside className="space-y-5">
        <div className="rounded-xl border border-gray-200 p-5 bg-white space-y-3">
          <h3 className="font-bold text-navy-800 mb-1">Goal &amp; dates</h3>
          <Field label="Goal amount (₹)">
            <input
              type="number"
              min={0}
              step={1}
              value={form.goal_amount}
              onChange={(e) => update('goal_amount', Number(e.target.value) || 0)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input
                type="date"
                value={form.starts_at}
                onChange={(e) => update('starts_at', e.target.value)}
                className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm"
              />
            </Field>
            <Field label="Ends">
              <input
                type="date"
                value={form.ends_at}
                onChange={(e) => update('ends_at', e.target.value)}
                className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm"
              />
            </Field>
          </div>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="">—</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Urgency">
            <select
              value={form.urgency}
              onChange={(e) => update('urgency', e.target.value as CampaignForm['urgency'])}
              className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="">Normal</option>
              <option value="urgent">Urgent (red banner on /campaigns)</option>
              <option value="emergency">Emergency (red banner on /campaigns)</option>
            </select>
          </Field>
        </div>

        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <h3 className="font-bold text-navy-800 mb-3">Visibility</h3>
          <Check id="active" label="Active (shown on /campaigns)" checked={form.is_active} onChange={(v) => update('is_active', v)} />
          <Check id="featured" label="Featured (top of /campaigns + homepage thermometer)" checked={form.is_featured} onChange={(v) => update('is_featured', v)} />
          <Check id="match" label="Matching-gift campaign" checked={form.match_campaign} onChange={(v) => update('match_campaign', v)} />

          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="mt-2 btn-gold inline-flex w-full h-10 rounded-md items-center justify-center gap-2"
          >
            <Save size={14} aria-hidden /> {form.id ? 'Save changes' : 'Create campaign'}
          </button>

          {saved && !error && <p className="mt-3 text-xs text-emerald-700">Saved.</p>}

          {form.id && form.is_active && (
            <a
              href={`/donate?campaign=${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-xs text-navy-700 hover:text-brand-600 inline-flex items-center gap-1.5"
            >
              <ExternalLink size={11} /> Open donate link
            </a>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Check({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 mt-0.5"
      />
      <label htmlFor={id} className="text-sm">{label}</label>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
