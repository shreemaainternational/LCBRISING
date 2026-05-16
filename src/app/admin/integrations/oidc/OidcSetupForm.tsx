'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, Loader2, AlertCircle, CheckCircle2, Trash2, Sparkles,
  PlugZap, ExternalLink, Info,
} from 'lucide-react';
import { OIDC_PROVIDER_PRESETS, findPreset } from '@/lib/oidc/known-providers';

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
  const [testing, startTest] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testInfo, setTestInfo] = useState<{ ok: boolean; endpoints?: Record<string, string | undefined>; error?: string } | null>(null);

  // pick whichever preset already matches the initial issuer (if any),
  // otherwise default to Lions when starting blank.
  const matched = initial?.issuer
    ? OIDC_PROVIDER_PRESETS.find((p) => p.defaults.issuer && initial.issuer!.startsWith(p.defaults.issuer.replace(/\/$/, '')))?.key
    : 'lions';
  const [preset, setPreset] = useState<string>(matched ?? 'custom');

  const [issuer, setIssuer] = useState(initial?.issuer ?? '');
  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [clientSecret, setClientSecret] = useState(initial?.client_secret ?? '');
  const [redirectUri, setRedirectUri] = useState(initial?.redirect_uri ?? defaultRedirect);
  const [scopes, setScopes] = useState(initial?.scopes ?? 'openid profile email');
  const [audience, setAudience] = useState(initial?.audience ?? '');
  const [providerLabel, setProviderLabel] = useState(initial?.provider_label ?? 'Lions International');
  const [discoveryUrl, setDiscoveryUrl] = useState(initial?.discovery_url ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [verifyOnSave, setVerifyOnSave] = useState(true);

  function applyPreset(key: string) {
    setPreset(key);
    const def = findPreset(key);
    if (!def) return;
    // Only overwrite blanks so we don't trash existing values when the
    // admin is comparing presets.
    setIssuer((cur) => cur || def.defaults.issuer);
    setScopes(() => def.defaults.scopes);
    setProviderLabel(() => def.defaults.provider_label);
    setAudience((cur) => cur || def.defaults.audience || '');
    setDiscoveryUrl((cur) => cur || def.defaults.discovery_url || '');
    setTestInfo(null);
  }

  function testConnection() {
    setTestInfo(null);
    if (!issuer.trim()) { setTestInfo({ ok: false, error: 'issuer_required' }); return; }
    startTest(async () => {
      const res = await fetch('/api/integrations/oidc/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuer, discovery_url: discoveryUrl || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      setTestInfo({
        ok: !!j.ok,
        endpoints: j.doc ?? undefined,
        error: j.error ?? (!j.ok ? `HTTP ${res.status}` : undefined),
      });
    });
  }

  function save() {
    setResult(null);
    if (!issuer.trim() || !clientId.trim() || !redirectUri.trim()) {
      setResult({ ok: false, msg: 'Issuer, Client ID and Redirect URI are required.' });
      return;
    }
    start(async () => {
      const res = await fetch('/api/integrations/oidc', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuer, client_id: clientId,
          client_secret: clientSecret || undefined,
          redirect_uri: redirectUri, scopes,
          audience: audience || undefined,
          provider_label: providerLabel,
          discovery_url: discoveryUrl || undefined,
          is_active: isActive,
          test: verifyOnSave,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setResult({ ok: false, msg: j.error ?? `HTTP ${res.status}` }); return; }
      if (j.test?.ok === false) {
        setResult({ ok: false, msg: `Saved, but discovery test failed: ${j.test.error}` });
      } else if (j.test?.ok === true) {
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

  const presetDef = findPreset(preset);

  return (
    <div className="space-y-5">
      {/* Provider preset picker */}
      <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-blue-50 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="inline-flex items-center gap-2 font-semibold text-navy-800">
            <PlugZap size={16} className="text-amber-500" />
            Provider preset
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {OIDC_PROVIDER_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              className={`p-2 rounded-md border text-xs font-semibold transition-colors text-left ${
                preset === p.key
                  ? 'bg-white border-amber-400 ring-1 ring-amber-300'
                  : 'bg-white/60 border-transparent hover:bg-white hover:border-gray-200'
              }`}
            >
              <div className="text-navy-800">{p.label}</div>
              {p.key === 'lions' && (
                <div className="text-[10px] text-amber-700 mt-0.5">Recommended</div>
              )}
            </button>
          ))}
        </div>
        {presetDef && presetDef.key !== 'custom' && (
          <div className="mt-3 text-xs text-gray-700 space-y-1.5">
            <p>{presetDef.blurb}</p>
            {presetDef.notes && (
              <ol className="list-decimal pl-5 space-y-0.5 marker:text-amber-600 marker:font-bold">
                {presetDef.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ol>
            )}
            {presetDef.docsUrl && (
              <a href={presetDef.docsUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-semibold mt-1">
                <ExternalLink size={11} /> Provider documentation
              </a>
            )}
          </div>
        )}
      </div>

      {/* Configuration fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Issuer URL *" full>
          <input value={issuer} onChange={(e) => setIssuer(e.target.value)}
            className={cls} placeholder="https://login.lionsclubs.org" />
          <p className="text-[11px] text-gray-500 mt-1">
            We append <code>/.well-known/openid-configuration</code> unless overridden below.
          </p>
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
          <p className="text-[11px] text-gray-500 mt-1">
            Register this exact URL with your provider.
          </p>
        </Field>
        <Field label="Scopes">
          <input value={scopes} onChange={(e) => setScopes(e.target.value)}
            className={cls} placeholder="openid profile email" />
        </Field>
        <Field label="Audience">
          <input value={audience} onChange={(e) => setAudience(e.target.value)}
            className={cls} placeholder="optional, e.g. https://api.lionsclubs.org" />
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
            <input type="checkbox" checked={verifyOnSave} onChange={(e) => setVerifyOnSave(e.target.checked)} />
            Verify discovery document on save
          </label>
        </div>
      </div>

      {/* Test result */}
      {testInfo && (
        <div className={`rounded-md border p-3 text-sm ${
          testInfo.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="inline-flex items-center gap-1.5 font-semibold">
            {testInfo.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {testInfo.ok ? 'Discovery document reachable' : `Discovery test failed${testInfo.error ? ' — ' + testInfo.error : ''}`}
          </div>
          {testInfo.ok && testInfo.endpoints && (
            <ul className="mt-2 text-xs space-y-0.5">
              {testInfo.endpoints.issuer && <li>issuer: <code className="font-mono">{testInfo.endpoints.issuer}</code></li>}
              {testInfo.endpoints.authorization_endpoint && <li>authorize: <code className="font-mono">{testInfo.endpoints.authorization_endpoint}</code></li>}
              {testInfo.endpoints.token_endpoint && <li>token: <code className="font-mono">{testInfo.endpoints.token_endpoint}</code></li>}
              {testInfo.endpoints.jwks_uri && <li>jwks: <code className="font-mono">{testInfo.endpoints.jwks_uri}</code></li>}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t">
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {pending ? 'Saving…' : 'Save & Activate'}
        </button>
        <button type="button" onClick={testConnection} disabled={testing || !issuer.trim()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {testing ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
          Test connection
        </button>
        {initial?.is_active && (
          <button type="button" onClick={deactivate} disabled={pending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-rose-700 hover:bg-rose-50">
            <Trash2 size={13} /> Deactivate
          </button>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-500">
          <Info size={11} /> Settings are stored in the database and override env vars.
        </span>
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
