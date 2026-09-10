'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Save, ExternalLink } from 'lucide-react';

export type CampaignForm = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  tagline: string;
  goal_amount: number;
  currency: string;
  starts_at: string;
  ends_at: string;
  hero_image: string;
  urgency: string;
  impact_metric: string;
  category: string;
  match_campaign: boolean;
  is_active: boolean;
  is_featured: boolean;
  activity_ids: string[];
};

export type ActivityOption = { id: string; title: string; date: string; category: string | null };

export function CampaignEditor({
  initial,
  activityOptions,
}: {
  initial: CampaignForm;
  activityOptions: ActivityOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<CampaignForm>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleActivity(id: string) {
    setForm((f) => ({
      ...f,
      activity_ids: f.activity_ids.includes(id)
        ? f.activity_ids.filter((a) => a !== id)
        : [...f.activity_ids, id],
    }));
  }

  async function save() {
    setError(null);
    if (!form.goal_amount || form.goal_amount <= 0) {
      setError('Goal amount must be a positive number.');
      return;
    }
    const res = await fetch('/api/admin/campaigns', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Save failed');
      return;
    }
    startTransition(() => {
      if (!form.id && json.id) {
        router.replace(`/admin/campaigns/${json.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* Main editor */}
      <div className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. District 3232 F1 Vision Mission"
            className="w-full h-12 px-3 rounded-md border border-gray-300 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Slug">
            <input
              type="text"
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              placeholder="auto-generated-from-title"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm font-mono"
            />
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

        <Field label="Tagline">
          <textarea
            value={form.tagline}
            onChange={(e) => update('tagline', e.target.value)}
            placeholder="One or two sentences summarising the cause."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <Field label="Description (Markdown)">
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={12}
            placeholder="## Objective&#10;&#10;Describe the campaign's real objective, area served, and target beneficiaries."
            className="w-full px-3 py-3 rounded-md border border-gray-300 text-sm font-mono leading-relaxed"
          />
        </Field>

        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Goal amount (₹)">
            <input
              type="number"
              min={1}
              value={form.goal_amount || ''}
              onChange={(e) => update('goal_amount', Number(e.target.value) || 0)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="Starts">
            <input
              type="date"
              value={form.starts_at}
              onChange={(e) => update('starts_at', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="Ends">
            <input
              type="date"
              value={form.ends_at}
              onChange={(e) => update('ends_at', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Category">
            <input
              type="text"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="e.g. Vision, Education, Hunger Relief"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="Urgency">
            <select
              value={form.urgency}
              onChange={(e) => update('urgency', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </Field>
        </div>

        <Field label="Impact metric (optional, real figures only)">
          <input
            type="text"
            value={form.impact_metric}
            onChange={(e) => update('impact_metric', e.target.value)}
            placeholder="e.g. 2,400 screenings funded so far"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <h3 className="font-bold text-navy-800 mb-1">Related service activities</h3>
          <p className="text-xs text-gray-500 mb-3">
            Link the real activities that report progress against this campaign. Statistics on the
            public campaign page are computed only from what you select here.
          </p>
          {activityOptions.length === 0 ? (
            <p className="text-sm text-gray-500">No activities recorded yet.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-md">
              {activityOptions.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.activity_ids.includes(a.id)}
                    onChange={() => toggleActivity(a.id)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1">{a.title}</span>
                  <span className="text-xs text-gray-400">{a.date}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-5">
        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <h3 className="font-bold text-navy-800 mb-3">Publish</h3>

          <div className="flex items-center gap-2 mb-3">
            <input
              id="active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update('is_active', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="active" className="text-sm">Active (visible on /campaigns)</label>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input
              id="featured"
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => update('is_featured', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="featured" className="text-sm">Featured on /campaigns</label>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              id="match"
              type="checkbox"
              checked={form.match_campaign}
              onChange={(e) => update('match_campaign', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="match" className="text-sm">Donations matched</label>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn-gold inline-flex w-full h-10 rounded-md items-center justify-center gap-2"
          >
            <Save size={14} aria-hidden /> Save
          </button>

          {form.id && form.slug && (
            <a
              href={`/campaigns/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-xs text-navy-700 hover:text-brand-600 inline-flex items-center gap-1.5"
            >
              <ExternalLink size={11} /> View live page
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
