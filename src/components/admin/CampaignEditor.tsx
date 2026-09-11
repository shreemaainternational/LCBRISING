'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Save, Send, ExternalLink, Search } from 'lucide-react';

export type CampaignForm = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  tagline: string;
  goal_amount: number;
  hero_image: string;
  category: string;
  urgency: '' | 'normal' | 'urgent' | 'emergency';
  impact_metric: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_featured: boolean;
  match_campaign: boolean;
  activity_ids: string[];
};

export type ActivityOption = { id: string; title: string; date: string | null; category: string | null };

export function CampaignEditor({
  initial,
  activities,
}: {
  initial: CampaignForm;
  activities: ActivityOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<CampaignForm>(initial);
  const [error, setError] = useState<string | null>(null);
  const [activityQuery, setActivityQuery] = useState('');
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

  const filteredActivities = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => a.title.toLowerCase().includes(q));
  }, [activities, activityQuery]);

  async function save(publish: boolean) {
    setError(null);
    const payload = { ...form, is_active: publish || form.is_active };
    const res = await fetch('/api/admin/campaigns', {
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
        router.replace(`/admin/campaigns/${json.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      {/* Main editor */}
      <div className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            Campaign name
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

        <Field label="Tagline (short, shown on cards)">
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => update('tagline', e.target.value)}
            placeholder="Every ₹500 funds one full screening + spectacles."
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={6}
            placeholder="Describe the cause, objective, and who benefits."
            className="w-full px-3 py-3 rounded-md border border-gray-300 text-sm leading-relaxed"
          />
        </Field>

        <Field label="Impact metric (optional, real figures only)">
          <input
            type="text"
            value={form.impact_metric}
            onChange={(e) => update('impact_metric', e.target.value)}
            placeholder="e.g. 1,240 screenings completed so far"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <h3 className="font-bold text-navy-800 mb-1">Related Service Activities</h3>
          <p className="text-xs text-gray-500 mb-3">
            Link the real activities this campaign funds or reports on. Statistics on the public
            campaign page are computed live from these — never entered by hand.
          </p>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              value={activityQuery}
              onChange={(e) => setActivityQuery(e.target.value)}
              placeholder="Search activities…"
              className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-300 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-100">
            {filteredActivities.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No activities found.</p>
            ) : (
              filteredActivities.map((a) => (
                <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.activity_ids.includes(a.id)}
                    onChange={() => toggleActivity(a.id)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1 truncate">{a.title}</span>
                  {a.date && <span className="text-xs text-gray-400 flex-shrink-0">{a.date}</span>}
                </label>
              ))
            )}
          </div>
          {form.activity_ids.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">{form.activity_ids.length} activity(ies) linked.</p>
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
            <label htmlFor="active" className="text-sm">Active (shown on /campaigns)</label>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input
              id="featured"
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => update('is_featured', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="featured" className="text-sm">Featured (hero banner)</label>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input
              id="matched"
              type="checkbox"
              checked={form.match_campaign}
              onChange={(e) => update('match_campaign', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="matched" className="text-sm">Donation matched badge</label>
          </div>

          <button
            type="button"
            onClick={() => save(false)}
            disabled={pending}
            className="btn-navy inline-flex w-full h-10 rounded-md items-center justify-center gap-2 mb-2"
          >
            <Save size={14} aria-hidden /> Save
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="btn-gold inline-flex w-full h-10 rounded-md items-center justify-center gap-2"
          >
            <Send size={14} aria-hidden /> Save &amp; activate
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

        <div className="rounded-xl border border-gray-200 p-5 bg-white space-y-3">
          <h3 className="font-bold text-navy-800 mb-1">Goal &amp; timing</h3>
          <Field label="Goal amount (INR)">
            <input
              type="number"
              min={1}
              value={form.goal_amount || ''}
              onChange={(e) => update('goal_amount', Number(e.target.value) || 0)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input
                type="date"
                value={form.starts_at ? form.starts_at.slice(0, 10) : ''}
                onChange={(e) => update('starts_at', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
              />
            </Field>
            <Field label="Ends">
              <input
                type="date"
                value={form.ends_at ? form.ends_at.slice(0, 10) : ''}
                onChange={(e) => update('ends_at', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-5 bg-white space-y-3">
          <h3 className="font-bold text-navy-800 mb-1">Classification</h3>
          <Field label="Category / cause">
            <input
              type="text"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="e.g. Vision, Hunger Relief"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
          <Field label="Urgency">
            <select
              value={form.urgency}
              onChange={(e) => update('urgency', e.target.value as CampaignForm['urgency'])}
              className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency appeal</option>
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
