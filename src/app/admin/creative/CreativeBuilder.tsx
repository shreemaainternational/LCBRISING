'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ContentType =
  | 'social_post' | 'flyer_text' | 'invitation' | 'birthday'
  | 'article' | 'press_release' | 'video_script' | 'blog_article';

const TYPES: { key: ContentType; label: string; canvaTemplate?: string }[] = [
  { key: 'social_post',   label: 'Social Post' },
  { key: 'flyer_text',    label: 'Flyer',         canvaTemplate: 'flyer' },
  { key: 'invitation',    label: 'Invitation',    canvaTemplate: 'invitation' },
  { key: 'birthday',      label: 'Birthday',      canvaTemplate: 'birthday' },
  { key: 'article',       label: 'Article' },
  { key: 'press_release', label: 'Press Release', canvaTemplate: 'press_release' },
  { key: 'video_script',  label: 'Video Script' },
  { key: 'blog_article',  label: 'Blog Post' },
];

type Platform = 'facebook' | 'instagram' | 'linkedin' | 'whatsapp';
const PLATFORMS: Platform[] = ['facebook', 'instagram', 'linkedin', 'whatsapp'];

interface AiOutput {
  caption?: string; hashtags?: string[]; body?: string;
  headline?: string; subheading?: string; quote?: string; cta?: string;
  scenes?: { text: string; duration_seconds?: number }[];
}

export function CreativeBuilder() {
  const [type, setType] = useState<ContentType>('social_post');
  const [form, setForm] = useState({
    title: '', description: '', location: 'Vadodara',
    language: 'en' as 'en' | 'gu' | 'hi',
    tone: 'inspirational' as 'inspirational' | 'formal' | 'friendly' | 'urgent' | 'celebratory',
  });
  const [platforms, setPlatforms] = useState<Platform[]>(['facebook', 'instagram']);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [content, setContent] = useState<AiOutput | null>(null);
  const [creative, setCreative] = useState<{ id: string; status: string; output_url?: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<string[] | null>(null);

  const tpl = TYPES.find((t) => t.key === type)!;

  async function generate() {
    setBusy('ai'); setError(null); setContent(null);
    try {
      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'AI failed');
      setContent(json.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function design() {
    if (!tpl.canvaTemplate) return;
    setBusy('canva'); setError(null); setCreative(null);
    try {
      const res = await fetch('/api/canva/generate-design', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          template_type: tpl.canvaTemplate,
          data: {
            headline: content?.headline ?? form.title,
            subheading: content?.subheading ?? '',
            body: content?.body ?? content?.caption ?? form.description,
            cta: content?.cta ?? 'We Serve',
            date: new Date().toLocaleDateString(),
            location: form.location,
            logo_url: process.env.NEXT_PUBLIC_BRAND_LOGO_URL ?? '',
          },
          format: 'png',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Canva failed');
      setCreative({ id: json.creative_id, status: 'rendering' });
      // Poll
      pollCreative(json.creative_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function pollCreative(id: string) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const res = await fetch(`/api/creatives/${id}`);
      if (!res.ok) continue;
      const json = await res.json();
      setCreative(json.creative);
      if (json.creative.status === 'ready' || json.creative.status === 'failed') break;
    }
  }

  async function publish() {
    if (!content) return;
    setBusy('post'); setError(null); setPosted(null);
    try {
      const res = await fetch('/api/social/post', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          platforms,
          caption: content.caption ?? content.body ?? form.title,
          hashtags: content.hashtags ?? [],
          media_urls: creative?.output_url ? [creative.output_url] : [],
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          creative_id: creative?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Publish failed');
      setPosted(json.posts.map((p: { platform: string }) => p.platform));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>1. Choose type</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`px-3 py-2 rounded-md border text-sm ${
                    type === t.key
                      ? 'bg-navy-800 text-white border-navy-800'
                      : 'border-gray-300 hover:border-navy-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Brief</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                     placeholder="e.g. Free eye-screening camp in Karelibaug" />
            </div>
            <div>
              <Label>Description / context</Label>
              <Textarea value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="What happened or will happen, who benefits, key numbers" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label>Language</Label>
                <select className="h-10 w-full rounded-md border border-gray-300 px-3"
                        value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as 'en' })}>
                  <option value="en">English</option>
                  <option value="gu">Gujarati</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
              <div>
                <Label>Tone</Label>
                <select className="h-10 w-full rounded-md border border-gray-300 px-3"
                        value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value as 'inspirational' })}>
                  <option>inspirational</option><option>formal</option><option>friendly</option>
                  <option>urgent</option><option>celebratory</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3. Generate</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={generate} disabled={!form.title || busy !== null}>
              {busy === 'ai' ? 'Generating…' : '✨ Generate Content (AI)'}
            </Button>
            {tpl.canvaTemplate && (
              <Button onClick={design} variant="outline" disabled={busy !== null || !content}>
                {busy === 'canva' ? 'Designing…' : `🎨 Generate Design (Canva: ${tpl.canvaTemplate})`}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>4. Publish</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={platforms.includes(p)} onChange={(e) => {
                    setPlatforms(e.target.checked
                      ? [...platforms, p]
                      : platforms.filter((x) => x !== p));
                  }} />
                  {p}
                </label>
              ))}
            </div>
            <div>
              <Label>Schedule for (optional)</Label>
              <Input type="datetime-local" value={scheduledAt}
                     onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <Button onClick={publish} variant="primary"
                    disabled={!content || platforms.length === 0 || busy !== null}>
              {busy === 'post' ? 'Publishing…' : scheduledAt ? '📅 Schedule' : '🚀 Publish now'}
            </Button>
            {posted && (
              <p className="text-sm text-green-700">
                Queued for: {posted.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            {!content ? (
              <p className="text-gray-500 text-sm">Generate content to preview here.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {content.headline && (
                  <div>
                    <div className="text-xs uppercase text-gray-500">Headline</div>
                    <div className="font-bold text-lg text-navy-800">{content.headline}</div>
                  </div>
                )}
                {content.subheading && (
                  <div className="text-gray-700 italic">{content.subheading}</div>
                )}
                {content.caption && (
                  <p className="whitespace-pre-line">{content.caption}</p>
                )}
                {content.body && (
                  <p className="whitespace-pre-line">{content.body}</p>
                )}
                {content.quote && (
                  <blockquote className="border-l-4 border-brand-500 pl-3 text-gray-700">
                    “{content.quote}”
                  </blockquote>
                )}
                {content.cta && <Badge variant="default">{content.cta}</Badge>}
                {content.hashtags && content.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {content.hashtags.map((h) => (
                      <Badge key={h} variant="secondary">#{h.replace(/^#/, '')}</Badge>
                    ))}
                  </div>
                )}
                {content.scenes && (
                  <ol className="list-decimal pl-5 space-y-1">
                    {content.scenes.map((s, i) => (
                      <li key={i}>
                        <span className="text-xs text-gray-500">{s.duration_seconds ?? 3}s</span> {s.text}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {creative && (
          <Card>
            <CardHeader>
              <CardTitle>Design — {creative.status}</CardTitle>
            </CardHeader>
            <CardContent>
              {creative.status === 'ready' && creative.output_url ? (
                <a href={creative.output_url} target="_blank" rel="noreferrer">
                  <img src={creative.output_url} alt="design preview" className="rounded border" />
                </a>
              ) : creative.status === 'failed' ? (
                <p className="text-sm text-red-600">Design failed. Check Canva template ID.</p>
              ) : (
                <div className="text-sm text-gray-600">
                  Canva is rendering. This usually takes 5–20 seconds.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
