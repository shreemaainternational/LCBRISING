'use client';
import { useState, useTransition, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles, Loader2, RefreshCw, MessageCircle, Download, Copy, Check, AlertCircle, Palette,
} from 'lucide-react';

type Occasion = 'birthday' | 'anniversary' | 'award' | 'festival' | 'event' | 'achievement' | 'thank_you' | 'condolence';
type Tone = 'warm' | 'formal' | 'witty' | 'heartfelt' | 'celebratory';
type Lang = 'en' | 'gu' | 'hi' | 'en+gu';

interface MemberLite {
  id: string;
  name: string;
  phone: string | null;
  birthday: string | null;
}

interface Props {
  members: MemberLite[];
  initialRecipientId: string | null;
  initialOccasion: Occasion | null;
}

const OCCASIONS: { key: Occasion; label: string; emoji: string }[] = [
  { key: 'birthday',    label: 'Birthday',    emoji: '🎂' },
  { key: 'anniversary', label: 'Anniversary', emoji: '💝' },
  { key: 'award',       label: 'Award',       emoji: '🏆' },
  { key: 'festival',    label: 'Festival',    emoji: '✨' },
  { key: 'event',       label: 'Event',       emoji: '📅' },
  { key: 'achievement', label: 'Achievement', emoji: '🌟' },
  { key: 'thank_you',   label: 'Thank you',   emoji: '🙏' },
  { key: 'condolence',  label: 'Condolence',  emoji: '🕊️' },
];

const TONES: { key: Tone; label: string }[] = [
  { key: 'warm', label: 'Warm' },
  { key: 'formal', label: 'Formal' },
  { key: 'celebratory', label: 'Celebratory' },
  { key: 'heartfelt', label: 'Heartfelt' },
  { key: 'witty', label: 'Witty' },
];

const LANGS: { key: Lang; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'gu', label: 'ગુજરાતી' },
  { key: 'hi', label: 'हिन्दी' },
  { key: 'en+gu', label: 'EN + GU' },
];

const THEMES: { key: string; label: string; bg: string; accent: string }[] = [
  { key: 'royal',    label: 'Royal',    bg: '#0B2D6B', accent: '#F4B400' },
  { key: 'sunrise',  label: 'Sunrise',  bg: '#7C2D12', accent: '#FCD34D' },
  { key: 'emerald',  label: 'Emerald',  bg: '#064E3B', accent: '#FBBF24' },
  { key: 'rose',     label: 'Rose',     bg: '#9F1239', accent: '#FECDD3' },
];

export function GreetingComposer({ members, initialRecipientId, initialOccasion }: Props) {
  const [recipientId, setRecipientId] = useState<string | null>(initialRecipientId);
  const [recipientName, setRecipientName] = useState(
    initialRecipientId ? (members.find((m) => m.id === initialRecipientId)?.name ?? '') : '',
  );
  const [occasion, setOccasion] = useState<Occasion>(initialOccasion ?? 'birthday');
  const [tone, setTone] = useState<Tone>('warm');
  const [language, setLanguage] = useState<Lang>('en');
  const [context, setContext] = useState('');
  const [text, setText] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [source, setSource] = useState<'ai' | 'template' | null>(null);
  const [theme, setTheme] = useState(THEMES[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

  const matches = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [search, members]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function selectRecipient(m: MemberLite) {
    setRecipientId(m.id);
    setRecipientName(m.name);
    setSearch('');
  }

  function generate() {
    setError(null);
    if (!recipientName.trim()) { setError('Pick or type a recipient name first.'); return; }
    start(async () => {
      const res = await fetch('/api/ai/greeting', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion,
          recipient_name: recipientName,
          tone,
          language,
          context: context.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? `HTTP ${res.status}`); return; }
      setText(j.text ?? '');
      setHashtags(j.hashtags ?? []);
      setSource(j.source ?? null);
    });
  }

  // Re-render preview canvas whenever inputs change
  useEffect(() => { renderCard(); }, [text, recipientName, occasion, theme, hashtags]); // eslint-disable-line react-hooks/exhaustive-deps

  function renderCard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;

    // background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.bg);
    grad.addColorStop(1, shade(theme.bg, -20));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // gold decorative circles
    ctx.fillStyle = hexToRgba(theme.accent, 0.18);
    circle(ctx, W * 0.85, H * 0.12, 200);
    circle(ctx, W * 0.1, H * 0.92, 280);

    // gold border
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 40, W - 80, H - 80);

    // top decoration
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🦁  Lions Club of Baroda Rising Star  🦁', W / 2, 130);

    ctx.fillStyle = hexToRgba(theme.accent, 0.85);
    ctx.font = '600 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('District 3232 FI · Lions Year 2025-26', W / 2, 170);

    // Occasion banner
    const occMeta = OCCASIONS.find((o) => o.key === occasion);
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${occMeta?.emoji ?? ''}  ${occMeta?.label ?? ''}  ${occMeta?.emoji ?? ''}`, W / 2, 280);

    // recipient
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 68px system-ui, -apple-system, sans-serif';
    wrapText(ctx, recipientName || 'Dear Lion', W / 2, 380, W - 200, 80);

    // body text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 38px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const bodyY = wrapText(ctx, text || 'Your AI-written greeting will appear here once you tap Generate.', W / 2, 500, W - 160, 56);

    // footer
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText('— With love from the Lions family —', W / 2, Math.max(bodyY + 70, H - 180));

    // hashtags
    if (hashtags.length) {
      ctx.fillStyle = hexToRgba('#ffffff', 0.7);
      ctx.font = '500 22px system-ui, -apple-system, sans-serif';
      const tagLine = hashtags.slice(0, 5).map((t) => `#${t}`).join('  ');
      ctx.fillText(tagLine, W / 2, H - 110);
    }

    // bottom brand
    ctx.fillStyle = hexToRgba('#ffffff', 0.55);
    ctx.font = '500 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('barodarisingstar.com', W / 2, H - 70);
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `greeting-${occasion}-${recipientName.replace(/\W+/g, '_') || 'lion'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  async function shareViaSystem() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'greeting.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void> };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await nav.share!({ files: [file], title: 'Greeting from Lions', text });
        } catch { /* user cancelled */ }
      } else {
        downloadPng();
      }
    }, 'image/png');
  }

  async function copyText() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard unavailable.');
    }
  }

  const recipientMember = recipientId ? members.find((m) => m.id === recipientId) : null;
  const waLink = recipientMember?.phone
    ? `https://wa.me/${recipientMember.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="space-y-4">
      {/* Recipient */}
      <Field label="Recipient">
        <input
          type="text"
          value={recipientName || search}
          onChange={(e) => {
            setRecipientName('');
            setRecipientId(null);
            setSearch(e.target.value);
          }}
          placeholder="Name or pick a member"
          className="w-full px-3 py-2.5 border rounded-2xl text-sm shadow-sm"
        />
        {matches.length > 0 && (
          <div className="mt-1 bg-white rounded-xl border shadow-sm divide-y max-h-48 overflow-y-auto">
            {matches.map((m) => (
              <button key={m.id} type="button" onClick={() => selectRecipient(m)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                {m.name}
                {m.birthday && <span className="text-xs text-gray-500"> · 🎂 {m.birthday.slice(5)}</span>}
              </button>
            ))}
          </div>
        )}
      </Field>

      {/* Occasion */}
      <Field label="Occasion">
        <div className="grid grid-cols-4 gap-2">
          {OCCASIONS.map((o) => (
            <button key={o.key} type="button" onClick={() => setOccasion(o.key)}
              className={`py-2 rounded-xl text-[11px] font-bold border-2 ${
                occasion === o.key ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-transparent bg-gray-100 text-gray-600'
              }`}>
              <div className="text-base leading-none mb-0.5">{o.emoji}</div>
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Tone + Language */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tone">
          <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full px-3 py-2.5 border rounded-2xl text-sm shadow-sm bg-white">
            {TONES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Language">
          <select value={language} onChange={(e) => setLanguage(e.target.value as Lang)}
            className="w-full px-3 py-2.5 border rounded-2xl text-sm shadow-sm bg-white">
            {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </Field>
      </div>

      {/* Context */}
      <Field label="Optional context">
        <input value={context} onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. 25th wedding anniversary, twin daughters' birthday…"
          className="w-full px-3 py-2.5 border rounded-2xl text-sm shadow-sm" />
      </Field>

      {/* Generate */}
      <button type="button" onClick={generate} disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white font-bold shadow-md shadow-amber-500/30 disabled:opacity-60 active:scale-[0.99] transition">
        {pending ? <Loader2 className="animate-spin" size={16} /> :
          text ? <RefreshCw size={16} /> : <Sparkles size={16} />}
        {pending ? 'Writing…' : text ? 'Regenerate' : 'Generate with AI'}
      </button>
      {source === 'template' && !pending && (
        <p className="text-[11px] text-amber-700 inline-flex items-center gap-1 -mt-2">
          <AlertCircle size={11} /> Used hand-written template — set OPENAI_API_KEY for AI generation.
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-700 inline-flex items-center gap-1 -mt-2">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      {/* Editable text */}
      {text && (
        <Field label="Edit message">
          <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2.5 border rounded-2xl text-sm shadow-sm" />
        </Field>
      )}

      {/* Theme picker */}
      <Field label={<span className="inline-flex items-center gap-1"><Palette size={12} /> Card theme</span>}>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button key={t.key} type="button" onClick={() => setTheme(t)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold border-2 ${
                theme.key === t.key ? 'border-navy-800' : 'border-transparent'
              }`}
              style={{ background: t.bg, color: t.accent }}>
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Preview */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-600 px-1 mb-1.5">Preview</div>
        <div className="bg-gray-100 rounded-2xl p-2">
          <canvas ref={canvasRef}
            className="w-full rounded-xl shadow-md"
            style={{ aspectRatio: '1 / 1', maxWidth: '100%' }} />
        </div>
      </div>

      {/* Share row */}
      <div className="grid grid-cols-3 gap-2">
        <a
          href={text ? waLink : undefined}
          target="_blank" rel="noopener"
          onClick={(e) => { if (!text) e.preventDefault(); }}
          className={`inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition ${
            text ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 pointer-events-none'
          }`}>
          <MessageCircle size={16} /> WhatsApp
        </a>
        <button type="button" onClick={shareViaSystem} disabled={!text}
          className={`inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition ${
            text ? 'bg-navy-900 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
          <Download size={16} /> Save / Share
        </button>
        <button type="button" onClick={copyText} disabled={!text}
          className={`inline-flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition ${
            text ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>

      {hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {hashtags.map((t) => (
            <span key={t} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              #{t}
            </span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center pt-2">
        AI greetings · gpt-4o-mini · powered by the Lions District 3232 FI super-app
      </p>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1 px-1">{label}</span>
      {children}
    </label>
  );
}

// ---------- canvas helpers ----------
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines = text.split('\n').flatMap((line) => splitLine(ctx, line, maxWidth));
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  return y + (lines.length - 1) * lineHeight;
}
function splitLine(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string[] {
  const words = line.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      out.push(cur); cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) out.push(cur);
  return out;
}
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + percent * 2.55));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + percent * 2.55));
  const b = Math.max(0, Math.min(255, (n & 0xff) + percent * 2.55));
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}
function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${a})`;
}
