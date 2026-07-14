'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  connected: boolean;
  source: 'env' | 'oauth' | null;
  hasClientCreds: boolean;
  scope: string | null;
  accessTokenExpiresAt: string | null;
  connectedAt: string | null;
  lastError: string | null;
  envClientCreds: boolean;
  envStaticToken: boolean;
}

export function CanvaConnectForm(props: Props) {
  const params = useSearchParams();
  const router = useRouter();

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const justConnected = params.get('connected') === '1';
  const callbackError = params.get('error');

  const canConnect = props.hasClientCreds || props.envClientCreds;

  async function saveCreds(): Promise<boolean> {
    setBusy('save'); setErr(null); setMsg(null);
    try {
      const res = await fetch('/api/integrations/canva', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId.trim() || undefined,
          client_secret: clientSecret.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setMsg('Saved OAuth app credentials.');
      setClientSecret('');
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally { setBusy(null); }
  }

  async function saveAndConnect() {
    // Persist any freshly-entered creds first, then kick off the OAuth
    // round-trip (a full-page navigation to Canva's consent screen).
    if (clientId.trim() || clientSecret.trim()) {
      const ok = await saveCreds();
      if (!ok) return;
    }
    window.location.href = '/api/canva/oauth/login';
  }

  async function disconnect() {
    if (!confirm('Disconnect Canva? The stored tokens will be removed (app credentials are kept).')) return;
    setBusy('disconnect'); setErr(null); setMsg(null);
    try {
      const res = await fetch('/api/integrations/canva', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Disconnect failed');
      setMsg('Disconnected.');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  const expiresLabel = props.accessTokenExpiresAt
    ? new Date(props.accessTokenExpiresAt).toLocaleString()
    : null;

  return (
    <div className="space-y-5">
      {justConnected && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          ✅ Canva account connected. The Creative Builder can now generate designs.
        </p>
      )}
      {callbackError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          Connection failed: {callbackError}
        </p>
      )}

      {/* Current status */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {props.connected ? (
          <>
            <Badge variant="default">Connected</Badge>
            <span className="text-gray-600">
              via {props.source === 'env' ? 'pinned env token' : 'OAuth'}
            </span>
          </>
        ) : (
          <Badge variant="secondary">Not connected</Badge>
        )}
        {props.source === 'env' && props.envStaticToken && (
          <span className="text-amber-700 text-xs">
            (static <code>CANVA_API_KEY</code> — connect an account for auto-refresh)
          </span>
        )}
      </div>

      {(expiresLabel || props.connectedAt || props.scope) && (
        <dl className="text-xs text-gray-500 grid gap-1">
          {props.connectedAt && <div>Connected at: <span className="text-gray-700">{new Date(props.connectedAt).toLocaleString()}</span></div>}
          {expiresLabel && <div>Access token expires: <span className="text-gray-700">{expiresLabel}</span> <span className="text-gray-400">(auto-refreshed)</span></div>}
          {props.scope && <div className="break-all">Scopes: <span className="text-gray-700">{props.scope}</span></div>}
        </dl>
      )}

      {props.lastError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          Last token error: {props.lastError}
        </p>
      )}

      {/* OAuth app credentials */}
      <div className="border-t pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-navy-800">OAuth app credentials</h3>
          <p className="text-xs text-gray-500">
            {props.envClientCreds
              ? 'Set from environment variables (CANVA_CLIENT_ID / CANVA_CLIENT_SECRET). Fields below override in the database.'
              : props.hasClientCreds
                ? 'Stored in the database. Re-enter to update.'
                : 'Enter the client ID & secret from your Canva Connect integration.'}
          </p>
        </div>
        <div>
          <Label>Client ID</Label>
          <Input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={props.hasClientCreds ? '•••••••• (stored)' : 'OC-xxxxxxxxxxxx'}
            autoComplete="off"
          />
        </div>
        <div>
          <Label>Client Secret</Label>
          <Input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={props.hasClientCreds ? '•••••••• (stored — leave blank to keep)' : 'cnvca...'}
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={saveCreds}
            disabled={busy !== null || (!clientId.trim() && !clientSecret.trim())}
          >
            {busy === 'save' ? 'Saving…' : 'Save credentials'}
          </Button>
        </div>
      </div>

      {/* Connect / disconnect */}
      <div className="border-t pt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={saveAndConnect}
          disabled={busy !== null || (!canConnect && !clientId.trim())}
          title={!canConnect && !clientId.trim() ? 'Enter the client ID & secret first' : undefined}
        >
          {props.connected ? '🔁 Reconnect Canva' : '🎨 Connect Canva'}
        </Button>
        {props.source === 'oauth' && (
          <Button variant="outline" onClick={disconnect} disabled={busy !== null}>
            {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        )}
      </div>

      {msg && !err && <p className="text-sm text-emerald-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
