'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Save, Send, ExternalLink } from 'lucide-react';

export type StoryForm = {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  beneficiary_name: string;
  beneficiary_age: number | null;
  location: string;
  hero_image: string;
  before_image: string;
  after_image: string;
  body: string;
  impact_quote: string;
  impact_metric: string;
  tags: string[];
  campaign_id: string;
  activity_id: string;
  is_published: boolean;
  is_featured: boolean;
};

export type CampaignOption = { id: string; title: string };
export type ActivityOption = { id: string; title: string; date: string };

export function StoryEditor({
  initial,
  campaignOptions = [],
  activityOptions = [],
}: {
  initial: StoryForm;
  campaignOptions?: CampaignOption[];
  activityOptions?: ActivityOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<StoryForm>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof StoryForm>(key: K, value: StoryForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(publish: boolean) {
    setError(null);
    const payload = { ...form, is_published: publish || form.is_published };
    const res = await fetch('/api/admin/stories', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Save failed');
      return;
    }
    startTransition(() => {
      if (!form.id && json.id) {
        router.replace(`/admin/stories/${json.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
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
            placeholder="e.g. Arya can see the blackboard again"
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

        <Field label="Subtitle">
          <textarea
            value={form.subtitle}
            onChange={(e) => update('subtitle', e.target.value)}
            placeholder="One or two sentences summarising the change in this person's life."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <Field label="Impact quote (real, attributable — never invented)">
          <input
            type="text"
            value={form.impact_quote}
            onChange={(e) => update('impact_quote', e.target.value)}
            placeholder="A real quote from the beneficiary or family, with their consent"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <Field label="Full story (Markdown)">
          <textarea
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            rows={16}
            placeholder="## What happened&#10;&#10;Tell the real story. Use **bold**, *italic*, > blockquotes, and lists."
            className="w-full px-3 py-3 rounded-md border border-gray-300 text-sm font-mono leading-relaxed"
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Before image URL (optional)">
            <input
              type="url"
              value={form.before_image}
              onChange={(e) => update('before_image', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="After image URL (optional)">
            <input
              type="url"
              value={form.after_image}
              onChange={(e) => update('after_image', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          Only enter real beneficiaries who have given consent to be featured. Names, ages,
          quotes, and photos here are shown publicly and used to solicit donations — never
          fill this in with a placeholder or composite story.
        </div>

        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <h3 className="font-bold text-navy-800 mb-3">Publish</h3>

          <div className="flex items-center gap-2 mb-3">
            <input
              id="published"
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => update('is_published', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="published" className="text-sm">Published</label>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              id="featured"
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => update('is_featured', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="featured" className="text-sm">Spotlight on /stories</label>
          </div>

          <button
            type="button"
            onClick={() => save(false)}
            disabled={pending}
            className="btn-navy inline-flex w-full h-10 rounded-md items-center justify-center gap-2 mb-2"
          >
            <Save size={14} aria-hidden /> Save draft
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="btn-gold inline-flex w-full h-10 rounded-md items-center justify-center gap-2"
          >
            <Send size={14} aria-hidden /> Publish
          </button>

          {form.id && form.slug && (
            <a
              href={`/stories/${form.slug}`}
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

        <div className="rounded-xl border border-gray-200 p-5 bg-white space-y-3">
          <h3 className="font-bold text-navy-800 mb-1">Beneficiary</h3>
          <Field label="Name">
            <input
              type="text"
              value={form.beneficiary_name}
              onChange={(e) => update('beneficiary_name', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="Age">
            <input
              type="number"
              min={0}
              max={120}
              value={form.beneficiary_age ?? ''}
              onChange={(e) => update('beneficiary_age', e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="Location">
            <input
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="e.g. Vadodara, Gujarat"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="Impact metric (optional)">
            <input
              type="text"
              value={form.impact_metric}
              onChange={(e) => update('impact_metric', e.target.value)}
              placeholder="e.g. 1,240 children screened in 2025"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="Tags (comma separated)">
            <input
              type="text"
              value={form.tags.join(', ')}
              onChange={(e) =>
                update(
                  'tags',
                  e.target.value
                    .split(',')
                    .map((t) => t.trim().toLowerCase())
                    .filter(Boolean),
                )
              }
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-gray-200 p-5 bg-white space-y-3">
          <h3 className="font-bold text-navy-800 mb-1">Cross-links</h3>
          <Field label="Related campaign (optional)">
            <select
              value={form.campaign_id}
              onChange={(e) => update('campaign_id', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="">None</option>
              {campaignOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Related service activity (optional)">
            <select
              value={form.activity_id}
              onChange={(e) => update('activity_id', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="">None</option>
              {activityOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.title} ({a.date})</option>
              ))}
            </select>
          </Field>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
