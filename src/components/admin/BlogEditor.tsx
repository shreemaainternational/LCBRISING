'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Sparkles, Save, Send, Languages, Tags, Loader2, ExternalLink } from 'lucide-react';

export type BlogPostForm = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  language: 'en' | 'gu' | 'hi';
  story_type: 'news' | 'story' | 'report' | 'campaign';
  tags: string[];
  cover_url: string;
  hero_quote: string;
  author_name: string;
  is_published: boolean;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  reading_time?: number;
};

const CATEGORIES = [
  'Humanitarian',
  'Vision',
  'Hunger Relief',
  'Environment',
  'Disaster Relief',
  'Youth',
  'Childhood Cancer',
  'Diabetes',
  'Education',
  'Women',
];

export function BlogEditor({
  initial,
  aiAvailable,
  aiUsage,
}: {
  initial: BlogPostForm;
  aiAvailable: boolean;
  aiUsage?: { cost_usd: number; calls: number };
}) {
  const router = useRouter();
  const [form, setForm] = useState<BlogPostForm>(initial);
  const [busy, setBusy] = useState<null | 'draft' | 'seo' | 'titles' | 'translate'>(null);
  const [titleIdeas, setTitleIdeas] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof BlogPostForm>(key: K, value: BlogPostForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function callAi(action: 'draft' | 'seo' | 'titles' | 'translate', extra: Record<string, unknown> = {}) {
    setBusy(action);
    setAiError(null);
    try {
      const res = await fetch('/api/admin/blog/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          title: form.title,
          excerpt: form.excerpt,
          body: form.body,
          category: form.category,
          language: form.language,
          postId: form.id,
          ...extra,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'AI call failed');

      if (action === 'draft') {
        update('title', json.headline || form.title);
        update('excerpt', json.subheading || form.excerpt);
        update('body', json.body || form.body);
      } else if (action === 'seo') {
        update('seo_title', json.seo_title || form.seo_title);
        update('seo_description', json.seo_description || form.seo_description);
        if (Array.isArray(json.tags)) update('tags', json.tags);
      } else if (action === 'titles') {
        setTitleIdeas(json.titles ?? []);
      } else if (action === 'translate') {
        update('title', json.title);
        update('body', json.body);
        update('language', (extra.targetLanguage as 'gu' | 'hi') ?? form.language);
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI call failed');
    } finally {
      setBusy(null);
    }
  }

  async function save(publish: boolean) {
    setAiError(null);
    const payload = { ...form, is_published: publish || form.is_published };
    const res = await fetch('/api/admin/blog', {
      method: form.id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setAiError(json.error ?? 'Save failed');
      return;
    }
    startTransition(() => {
      if (!form.id && json.id) {
        router.replace(`/admin/blog/${json.id}`);
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
            placeholder="A powerful, specific headline…"
            className="w-full h-12 px-3 rounded-md border border-gray-300 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {titleIdeas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {titleIdeas.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update('title', t)}
                  className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 hover:bg-brand-100"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
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
          <Field label="Cover image URL">
            <input
              type="url"
              value={form.cover_url}
              onChange={(e) => update('cover_url', e.target.value)}
              placeholder="https://…/cover.jpg"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
        </div>

        <Field label="Excerpt">
          <textarea
            value={form.excerpt}
            onChange={(e) => update('excerpt', e.target.value)}
            placeholder="One or two emotionally compelling sentences."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <Field label="Pull quote (optional)">
          <input
            type="text"
            value={form.hero_quote}
            onChange={(e) => update('hero_quote', e.target.value)}
            placeholder="“The line you want readers to remember.”"
            className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
          />
        </Field>

        <Field label="Body (Markdown)">
          <textarea
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            rows={20}
            placeholder="## A section heading&#10;&#10;Write your story. Use **bold**, *italic*, > blockquotes, and lists."
            className="w-full px-3 py-3 rounded-md border border-gray-300 text-sm font-mono leading-relaxed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Supports # / ## / ### headings, bold, italic, blockquotes, lists, images, and links.
          </p>
        </Field>

        {/* SEO block */}
        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-navy-800">SEO</h3>
            <button
              type="button"
              disabled={!aiAvailable || busy !== null}
              onClick={() => callAi('seo')}
              className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-50 text-brand-800 hover:bg-brand-100 disabled:opacity-50"
            >
              {busy === 'seo' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              AI generate
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="SEO title">
              <input
                type="text"
                value={form.seo_title}
                onChange={(e) => update('seo_title', e.target.value)}
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
          <Field label="SEO description" className="mt-3">
            <textarea
              value={form.seo_description}
              onChange={(e) => update('seo_description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm"
            />
          </Field>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-5">
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
            <label htmlFor="featured" className="text-sm">Pin to newsroom hero</label>
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
              href={`/blog/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-xs text-navy-700 hover:text-brand-600 inline-flex items-center gap-1.5"
            >
              <ExternalLink size={11} /> View live page
            </a>
          )}

          {aiError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {aiError}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-5 bg-white space-y-3">
          <h3 className="font-bold text-navy-800 mb-1">Classification</h3>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="">—</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Story type">
            <select
              value={form.story_type}
              onChange={(e) => update('story_type', e.target.value as BlogPostForm['story_type'])}
              className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="news">News</option>
              <option value="story">Human Story</option>
              <option value="report">Report</option>
              <option value="campaign">Campaign</option>
            </select>
          </Field>
          <Field label="Language">
            <select
              value={form.language}
              onChange={(e) => update('language', e.target.value as BlogPostForm['language'])}
              className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm bg-white"
            >
              <option value="en">English</option>
              <option value="gu">ગુજરાતી</option>
              <option value="hi">हिन्दी</option>
            </select>
          </Field>
          <Field label="Author name">
            <input
              type="text"
              value={form.author_name}
              onChange={(e) => update('author_name', e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <h3 className="font-bold text-navy-800 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-brand-600" /> AI assistance
          </h3>
          {!aiAvailable && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
              Set <code>OPENAI_API_KEY</code> to enable AI helpers.
            </p>
          )}
          <button
            type="button"
            disabled={!aiAvailable || busy !== null || !form.title}
            onClick={() => callAi('draft')}
            className="w-full text-sm inline-flex items-center justify-center gap-2 h-10 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 mb-2"
            title={!form.title ? 'Add a working title first' : ''}
          >
            {busy === 'draft' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} className="text-brand-600" />
            )}
            Draft article body
          </button>
          <button
            type="button"
            disabled={!aiAvailable || busy !== null || !form.title}
            onClick={() => callAi('titles', { topic: form.title || form.excerpt })}
            className="w-full text-sm inline-flex items-center justify-center gap-2 h-10 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 mb-2"
          >
            {busy === 'titles' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Tags size={14} className="text-brand-600" />
            )}
            Brainstorm titles
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!aiAvailable || busy !== null || !form.body}
              onClick={() => callAi('translate', { targetLanguage: 'gu' })}
              className="text-xs inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <Languages size={12} /> Gujarati
            </button>
            <button
              type="button"
              disabled={!aiAvailable || busy !== null || !form.body}
              onClick={() => callAi('translate', { targetLanguage: 'hi' })}
              className="text-xs inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <Languages size={12} /> Hindi
            </button>
          </div>

          {aiUsage && aiUsage.calls > 0 && (
            <p className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
              AI on this post: <span className="font-semibold text-navy-700">${aiUsage.cost_usd.toFixed(4)}</span>{' '}
              over {aiUsage.calls} call{aiUsage.calls === 1 ? '' : 's'}
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
