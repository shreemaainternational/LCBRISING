'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, AlertCircle, CheckCircle2, Trash2, Sparkles } from 'lucide-react';

interface SettingsRow {
  issuer: string | null;
  client_id: string | null;
  client_secret: string | null;
  redirect_uri: string | null;
  scopes: string | null;
  audience: string | null;
  provider_label: string | null;
  discovery_url: string | null;
  is_active: boolean;
}

interface Props {
  initial: SettingsRow | null;
  defaultRedirect: string;
}

export function OidcSetupForm({ initial, defaultRedirect }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [issuer, setIssuer] = useState(initial?.issuer ?? '');
  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [clientSecret, setClientSecret] = useState(initial?.client_secret ?? '');
  const [redirectUri, setRedirectUri] = useState(initial?.redirect_uri ?? defaultRedirect);
  const [scopes, setScopes] = useState(initial?.scopes ?? 'openid profile email');
  const [audience, setAudience] = useState(initial?.audience ?? '');
  const [providerLabel, setProviderLabel] = useState(initial?.provider_label ?? 'Lions International');
  const [discoveryUrl, setDiscoveryUrl] = useState(initial?.discovery_url ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [test, setTest] = useState(true);

  function save() {
    setResult(null);
    if (!issuer.trim() || !clientId.trim() || !redirectUri.trim()) {
      setResult({ ok: false, msg: 'Issuer, Client ID and Redirect URI are required.' });
      return;
    }
    start(async () => {
      const res = await fetch('/api/integrations/oidc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuer, client_id: clientId,
          client_secret: clientSecret || undefined,
          redirect_uri: redirectUri, scopes,
          audience: audience || undefined,
          provider_label: providerLabel,
          discovery_url: discoveryUrl || undefined,
          is_active: isActive,
          test,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, msg: j.error ?? `HTTP ${res.status}` });
        return;
      }
      const testInfo = j.test;
      if (testInfo && testInfo.ok === false) {
        setResult({ ok: false, msg: `Saved, but discovery test failed: ${testInfo.error}` });
      } else if (testInfo && testInfo.ok === true) {
        setResult({ ok: true, msg: 'Saved and verified against the discovery document.' });
      } else {
        setResult({ ok: true, msg: 'Saved.' });
      }
      router.refresh();
    });
  }

  function deactivate() {
    if (!confirm('Deactivate Lions OIDC? The "Sign in with Lions" buttons will disappear.')) return;
    start(async () => {
      await fetch('/api/integrations/oidc', { method: 'DELETE' });
      setResult({ ok: true, msg: 'Deactivated.' });
      router.refresh();
    });
  }

  function loadDevDefaults() {
    setIssuer('https://accounts.google.com');
    setClientId('YOUR_CLIENT_ID.apps.googleusercontent.com');
    setClientSecret('');
    setScopes('openid profile email');
    setProviderLabel('Google (dev test)');
    setDiscoveryUrl('');
    setIsActive(true);
    setResult({ ok: true, msg: 'Loaded Google OIDC defaults — fill in Client ID and Secret from Google Cloud Console.' });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Issuer URL *" full>
          <input value={issuer} onChange={(e) => setIssuer(e.target.value)}
            className={cls} placeholder="https://login.lionsclubs.org" />
          <p className="text-[11px] text-gray-500 mt-1">The base URL of your OIDC provider. We append <code>/.well-known/openid-configuration</code> unless overridden below.</p>
        </Field>
        <Field label="Client ID *">
          <input value={clientId} onChange={(e) => setClientId(e.target.value)}
            className={cls} placeholder="lcbrs-prod" />
        </Field>
        <Field label="Client Secret">
          <input type="password" value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className={cls}
            placeholder={initial?.client_secret ? '••••••••• (saved — leave blank to keep)' : 'optional for public clients'} />
        </Field>
        <Field label="Redirect URI *" full>
          <input value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)}
            className={cls} placeholder={defaultRedirect} />
          <p className="text-[11px] text-gray-500 mt-1">Register this exact URL with your provider.</p>
        </Field>
        <Field label="Scopes">
          <input value={scopes} onChange={(e) => setScopes(e.target.value)}
            className={cls} placeholder="openid profile email" />
        </Field>
        <Field label="Audience">
          <input value={audience} onChange={(e) => setAudience(e.target.value)}
            className={cls} placeholder="optional, e.g. api.lcbrs" />
        </Field>
        <Field label="Provider label">
          <input value={providerLabel} onChange={(e) => setProviderLabel(e.target.value)}
            className={cls} placeholder="Lions International" />
        </Field>
        <Field label="Discovery URL override" full>
          <input value={discoveryUrl} onChange={(e) => setDiscoveryUrl(e.target.value)}
            className={cls} placeholder="https://example.com/.well-known/openid-configuration (optional)" />
        </Field>
        <div className="md:col-span-2 flex flex-wrap items-center gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} />
            Verify discovery document on save
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-3 border-t">
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {pending ? 'Saving…' : 'Save & Activate'}
        </button>
        {initial?.is_active && (
          <button type="button" onClick={deactivate} disabled={pending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-rose-700 hover:bg-rose-50">
            <Trash2 size={13} /> Deactivate
          </button>
        )}
        <button type="button" onClick={loadDevDefaults}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 ml-auto">
          <Sparkles size={13} /> Load test defaults
        </button>
      </div>

      {result?.ok && (
        <p className="text-sm text-emerald-700 inline-flex items-center gap-1.5">
          <CheckCircle2 size={14} /> {result.msg}
        </p>
      )}
      {result && !result.ok && (
        <p className="text-sm text-rose-700 inline-flex items-center gap-1.5">
          <AlertCircle size={14} /> {result.msg}
        </p>
      )}
    </div>
  );
}

const cls = 'w-full px-3 py-2 border rounded-md text-sm';
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
