'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy, RotateCw, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Save, ClipboardPaste,
} from 'lucide-react';

interface Props {
  publicKey: string | null;
  publicKeyMasked: string | null;
  privateKeyMasked: string | null;
  subject: string | null;
  lastRotatedAt: string | null;
  envOverride: boolean;
}

export function PushKeyCard({
  publicKey, publicKeyMasked, privateKeyMasked, subject, lastRotatedAt, envOverride,
}: Props) {
  const router = useRouter();
  const [revealedPrivate, setRevealedPrivate] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [copied, setCopied] = useState<'public' | 'private' | 'env' | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [subjectInput, setSubjectInput] = useState(subject ?? 'mailto:admin@lcbaroda.org');
  const [saved, setSaved] = useState(false);

  async function reveal(): Promise<string | null> {
    return new Promise((resolve) => {
      start(async () => {
        const res = await fetch('/api/integrations/push', { method: 'POST' });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.private_key) { setError(j.error ?? 'reveal_failed'); resolve(null); return; }
        setRevealedPrivate(j.private_key as string);
        setShowing(true);
        resolve(j.private_key as string);
      });
    });
  }

  async function copyPublic() {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied('public');
      setTimeout(() => setCopied(null), 2500);
    } catch { setError('Clipboard unavailable'); }
  }

  async function copyPrivate() {
    const v = revealedPrivate ?? await reveal();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopied('private');
      setTimeout(() => setCopied(null), 2500);
    } catch { setError('Clipboard unavailable'); }
  }

  /** Copy the full ready-to-paste Vercel VAPID env block (reveals the private key first). */
  async function copyAllForVercel() {
    if (!publicKey) { setError('Public key unavailable'); return; }
    const priv = revealedPrivate ?? await reveal();
    if (!priv) return;
    const block = [
      `VAPID_PUBLIC_KEY=${publicKey}`,
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`,
      `VAPID_PRIVATE_KEY=${priv}`,
      `VAPID_SUBJECT=${subjectInput}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(block);
      setCopied('env');
      setTimeout(() => setCopied(null), 2500);
    } catch { setError('Clipboard unavailable'); }
  }

  function rotate() {
    if (!confirm('Generate a fresh VAPID keypair? Existing subscribers will continue to receive notifications because the public key is sent with every subscription — but anything cached in env vars must be updated manually.')) return;
    setError(null);
    start(async () => {
      const res = await fetch('/api/integrations/push', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'rotate_failed'); return; }
      setRevealedPrivate(j.settings?.private_key ?? null);
      setShowing(true);
      router.refresh();
    });
  }

  function saveSubject() {
    setError(null); setSaved(false);
    start(async () => {
      const res = await fetch('/api/integrations/push', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subjectInput }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'save_failed'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    });
  }

  const privateDisplay = showing && revealedPrivate ? revealedPrivate : (privateKeyMasked ?? '—');

  return (
    <div className="space-y-4">
      {envOverride && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 inline-flex items-start gap-1.5">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            Env vars <code>VAPID_PUBLIC_KEY</code> / <code>VAPID_PRIVATE_KEY</code> are set —
            they take precedence over the DB-stored keypair shown below.
          </span>
        </p>
      )}

      <div>
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Public Key</div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="flex-1 min-w-0 px-3 py-2 rounded-md border bg-gray-50 font-mono text-sm break-all">
            {publicKey ?? publicKeyMasked ?? '—'}
          </code>
          <button type="button" onClick={copyPublic} disabled={pending || !publicKey}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
            {copied === 'public' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            {copied === 'public' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Private Key</div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="flex-1 min-w-0 px-3 py-2 rounded-md border bg-gray-50 font-mono text-sm break-all">
            {privateDisplay}
          </code>
          <button type="button" onClick={() => setShowing((s) => !s)} disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border text-xs font-semibold text-gray-700 hover:bg-gray-50">
            {showing ? <EyeOff size={12} /> : <Eye size={12} />}
            {showing ? 'Hide' : 'Reveal'}
          </button>
          <button type="button" onClick={copyPrivate} disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
            {pending && !revealedPrivate ? <Loader2 className="animate-spin" size={12} /> : copied === 'private' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            {copied === 'private' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Subject (mailto)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)}
            placeholder="mailto:admin@yourdomain.org"
            className="flex-1 min-w-0 px-3 py-2 rounded-md border font-mono text-sm" />
          <button type="button" onClick={saveSubject} disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border text-xs font-semibold text-gray-700 hover:bg-gray-50">
            {pending ? <Loader2 className="animate-spin" size={12} /> : saved ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Save size={12} />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="pt-2 border-t space-y-2">
        <button type="button" onClick={copyAllForVercel} disabled={pending || !publicKey}
          title="Copies all four VAPID_* lines — paste straight into Vercel → Settings → Environment Variables"
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-60">
          {pending && !revealedPrivate ? <Loader2 className="animate-spin" size={12} /> : copied === 'env' ? <CheckCircle2 size={12} /> : <ClipboardPaste size={12} />}
          {copied === 'env' ? 'Copied all 4 lines' : 'Copy all for Vercel'}
        </button>
        <p className="text-xs text-gray-500">
          Copies the full <code>VAPID_*</code> env block — paste into Vercel → Settings → Environment
          Variables (Production + Preview), then redeploy to pin the keypair and flip Web Push to 🟢 Live.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t">
        <div className="text-xs text-gray-500">
          {lastRotatedAt
            ? <>Last rotated {new Date(lastRotatedAt).toLocaleString('en-IN')}.</>
            : <>Auto-provisioned on first install.</>}
        </div>
        <button type="button" onClick={rotate} disabled={pending}
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50">
          {pending ? <Loader2 className="animate-spin" size={12} /> : <RotateCw size={12} />}
          Rotate
        </button>
      </div>

      {error && (
        <p className="inline-flex items-center gap-1 text-xs text-rose-700">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
