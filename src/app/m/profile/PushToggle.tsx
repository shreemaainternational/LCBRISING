'use client';
import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Status = 'unsupported' | 'denied' | 'enabled' | 'disabled' | 'loading';

export function PushToggle() {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      // Push capability can only be probed in the browser, so status is
      // resolved from an effect rather than during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('unsupported'); return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }

    (async () => {
      try {
        const res = await fetch('/api/push/subscribe');
        const j = await res.json();
        setPublicKey(j.publicKey ?? null);
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? 'enabled' : 'disabled');
      } catch {
        setStatus('disabled');
      }
    })();
  }, []);

  async function enable() {
    setError(null); setBusy(true);
    try {
      if (!publicKey) throw new Error('Server has no VAPID public key configured');
      if (Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') { setStatus('denied'); setBusy(false); return; }
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'subscribe_failed');
      }
      setStatus('enabled');
    } catch (e) {
      setError(String(e));
    } finally { setBusy(false); }
  }

  async function disable() {
    setError(null); setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('disabled');
    } catch (e) {
      setError(String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status === 'enabled' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {status === 'enabled' ? <Bell size={18} /> : <BellOff size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-navy-800">Push Notifications</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {status === 'enabled' && 'Active on this device'}
            {status === 'disabled' && 'Off — enable to get activity alerts'}
            {status === 'denied' && 'Blocked in browser settings'}
            {status === 'unsupported' && 'This browser does not support push'}
            {status === 'loading' && 'Checking…'}
          </div>
        </div>
        {(status === 'disabled' || status === 'enabled') && (
          <button
            type="button"
            onClick={status === 'enabled' ? disable : enable}
            disabled={busy || !publicKey}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              status === 'enabled' ? 'bg-gray-100 text-gray-700' : 'bg-blue-800 text-white'
            } disabled:opacity-60`}
          >
            {busy ? <Loader2 className="animate-spin inline" size={12} /> : status === 'enabled' ? 'Disable' : 'Enable'}
          </button>
        )}
      </div>
      {status === 'disabled' && !publicKey && (
        <p className="text-[11px] text-blue-800 mt-2 inline-flex items-center gap-1">
          <AlertCircle size={11} /> VAPID keys not configured on server
        </p>
      )}
      {error && (
        <p className="text-[11px] text-red-700 mt-2 inline-flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
      {status === 'enabled' && !error && (
        <p className="text-[11px] text-emerald-700 mt-2 inline-flex items-center gap-1">
          <CheckCircle2 size={11} /> You&apos;ll receive activity, event and report notifications.
        </p>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
