'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy, RotateCw, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ClipboardPaste,
} from 'lucide-react';

interface Props {
  masked: string | null;
  lastRotatedAt: string | null;
  envOverride: boolean;
}

export function CronSecretCard({ masked, lastRotatedAt, envOverride }: Props) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [copied, setCopied] = useState<'raw' | 'env' | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** Fetch the plaintext secret, revealing it. Returns the value (or null). */
  function reveal(): Promise<string | null> {
    return new Promise((resolve) => {
      setError(null);
      start(async () => {
        const res = await fetch('/api/integrations/cron', { method: 'POST' });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.secret) { setError(j.error ?? 'reveal_failed'); resolve(null); return; }
        setRevealed(j.secret as string);
        setShowing(true);
        resolve(j.secret as string);
      });
    });
  }

  async function copyRaw() {
    const v = revealed ?? await reveal();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopied('raw');
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError('Clipboard unavailable');
    }
  }

  /** Copy the ready-to-paste Vercel env line: `CRON_SECRET=<value>`. */
  async function copyForVercel() {
    const v = revealed ?? await reveal();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(`CRON_SECRET=${v}`);
      setCopied('env');
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError('Clipboard unavailable');
    }
  }

  function rotate() {
    if (!confirm('Generate a fresh CRON_SECRET? Update your Vercel env var afterwards or scheduled jobs will start returning 401.')) return;
    setError(null);
    start(async () => {
      const res = await fetch('/api/integrations/cron', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'rotate_failed'); return; }
      setRevealed(j.secret as string);
      setShowing(true);
      router.refresh();
    });
  }

  const display = showing && revealed ? revealed : (masked ?? '—');

  return (
    <div className="space-y-3">
      {envOverride && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 inline-flex items-start gap-1.5">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            An env var <code>CRON_SECRET</code> is set on this deployment — Vercel&apos;s cron
            invocations are verified against it. The DB-stored value is used as a fallback
            when the env value doesn&apos;t match.
          </span>
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <code className="flex-1 min-w-0 px-3 py-2 rounded-md border bg-gray-50 font-mono text-sm break-all">
          {display}
        </code>
        <button type="button" onClick={() => setShowing((s) => !s)} disabled={pending}
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border text-xs font-semibold text-gray-700 hover:bg-gray-50">
          {showing ? <EyeOff size={12} /> : <Eye size={12} />}
          {showing ? 'Hide' : 'Reveal'}
        </button>
        <button type="button" onClick={copyRaw} disabled={pending}
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
          {pending && !revealed ? <Loader2 className="animate-spin" size={12} /> : copied === 'raw' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
          {copied === 'raw' ? 'Copied' : 'Copy'}
        </button>
        <button type="button" onClick={copyForVercel} disabled={pending}
          title="Copies CRON_SECRET=… — paste straight into Vercel → Settings → Environment Variables"
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold">
          {pending && !revealed ? <Loader2 className="animate-spin" size={12} /> : copied === 'env' ? <CheckCircle2 size={12} /> : <ClipboardPaste size={12} />}
          {copied === 'env' ? 'Copied' : 'Copy for Vercel'}
        </button>
        <button type="button" onClick={rotate} disabled={pending}
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50">
          {pending ? <Loader2 className="animate-spin" size={12} /> : <RotateCw size={12} />}
          Rotate
        </button>
      </div>
      <p className="text-xs text-gray-500">
        <strong>Copy for Vercel</strong> copies the full <code>CRON_SECRET=…</code> line — paste it into
        Vercel → Settings → Environment Variables (Production + Preview), then redeploy to flip this to 🟢 Live.
      </p>

      <div className="text-xs text-gray-500">
        {lastRotatedAt
          ? <>Last rotated {new Date(lastRotatedAt).toLocaleString('en-IN')}.</>
          : <>Auto-provisioned on first install.</>}
      </div>

      {error && (
        <p className="inline-flex items-center gap-1 text-xs text-rose-700">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
