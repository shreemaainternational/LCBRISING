'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, AlertCircle, CheckCircle2, Trash2, PlugZap } from 'lucide-react';

interface ApiSettingsRow {
  base_url: string | null;
  api_key: string | null;
  access_token: string | null;
  district_code: string | null;
  multi_district_code: string | null;
  is_active: boolean;
  sandbox_mode?: boolean;
  last_test_ok?: boolean | null;
  last_test_at?: string | null;
  last_test_error?: string | null;
}

interface Props {
  initial: ApiSettingsRow | null;
}

export function LionsApiSetupForm({ initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? '');
  const [apiKey, setApiKey] = useState(initial?.api_key ?? '');
  const [token, setToken] = useState(initial?.access_token ?? '');
  const [districtCode, setDistrictCode] = useState(initial?.district_code ?? '');
  const [mdCode, setMdCode] = useState(initial?.multi_district_code ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sandboxMode, setSandboxMode] = useState(initial?.sandbox_mode ?? false);
  const [test, setTest] = useState(true);

  function loadLionsDefaults() {
    setBaseUrl('https://api.lionsclubs.org/v1');
    setResult({ ok: true, msg: 'Loaded official Lions International API base URL.' });
  }

  function save() {
    setResult(null);
    if (!sandboxMode && !baseUrl.trim()) {
      setResult({ ok: false, msg: 'Base URL is required (or enable sandbox mode).' });
      return;
    }
    start(async () => {
      const res = await fetch('/api/integrations/lions-api', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: baseUrl,
          api_key: apiKey || undefined,
          access_token: token || undefined,
          district_code: districtCode || undefined,
          multi_district_code: mdCode || undefined,
          is_active: isActive,
          sandbox_mode: sandboxMode,
          test,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setResult({ ok: false, msg: j.error ?? `HTTP ${res.status}` }); return; }
      const info = j.test;
      if (info?.ok === false) setResult({ ok: false, msg: `Saved, but API test failed: ${info.error}` });
      else if (info?.ok === true) setResult({ ok: true, msg: 'Saved and tested against /districts.' });
      else setResult({ ok: true, msg: 'Saved.' });
      router.refresh();
    });
  }

  function deactivate() {
    if (!confirm('Deactivate Lions REST API? Sync runs will fall back to dry-run mode.')) return;
    start(async () => {
      await fetch('/api/integrations/lions-api', { method: 'DELETE' });
      setResult({ ok: true, msg: 'Deactivated.' });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
        <div className="font-semibold mb-1 inline-flex items-center gap-1.5">
          <PlugZap size={12} /> About this integration
        </div>
        <p>
          Pulls districts → clubs → members from the Lions International Member
          Portal REST API. Used by <code>/admin/sync/lions</code> and the daily
          Lions sync cron. Falls back to dry-run mode when not configured.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Base URL *" full>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
            className={cls} placeholder="https://api.lionsclubs.org/v1" />
        </Field>
        <Field label="API Key">
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            className={cls}
            placeholder={initial?.api_key ? '••••••••• (saved — leave blank to keep)' : 'X-API-Key header'} />
        </Field>
        <Field label="Access Token">
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            className={cls}
            placeholder={initial?.access_token ? '••••••••• (saved — leave blank to keep)' : 'Bearer token (optional)'} />
        </Field>
        <Field label="Default district code">
          <input value={districtCode} onChange={(e) => setDistrictCode(e.target.value)}
            className={cls} placeholder="3232 F1" />
        </Field>
        <Field label="Default multi-district code">
          <input value={mdCode} onChange={(e) => setMdCode(e.target.value)}
            className={cls} placeholder="323" />
        </Field>
        <div className="md:col-span-2 flex flex-wrap items-center gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} />
            Test /districts endpoint on save
          </label>
        </div>
        <div className="md:col-span-2 rounded-md border-2 border-dashed border-purple-300 bg-purple-50/40 p-3">
          <label className="inline-flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={sandboxMode}
              onChange={(e) => setSandboxMode(e.target.checked)}
              className="mt-0.5" />
            <span className="text-sm">
              <span className="font-semibold text-purple-800">Sandbox mode</span>
              <span className="inline-block ml-2 text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full">
                no API needed
              </span>
              <p className="text-xs text-purple-700/90 mt-1 leading-snug">
                Returns synthetic districts, clubs and members from <code>/api/sync/lions</code> so
                you can exercise the sync UI without LCI API credentials.
              </p>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t">
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {pending ? 'Saving…' : 'Save & Activate'}
        </button>
        <button type="button" onClick={loadLionsDefaults}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-50">
          Use official LCI URL
        </button>
        {initial?.is_active && (
          <button type="button" onClick={deactivate} disabled={pending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-rose-700 hover:bg-rose-50">
            <Trash2 size={13} /> Deactivate
          </button>
        )}
      </div>

      {initial?.last_test_at && (
        <div className={`text-xs px-3 py-2 rounded border inline-flex items-start gap-1.5 ${
          initial.last_test_ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {initial.last_test_ok ? <CheckCircle2 size={12} className="mt-0.5" /> : <AlertCircle size={12} className="mt-0.5" />}
          <span>
            <strong>Last test:</strong> {initial.last_test_ok ? 'OK' : 'Failed'} ·
            {' ' + new Date(initial.last_test_at).toLocaleString('en-IN')}
            {initial.last_test_error && <span className="block mt-1 font-mono">{initial.last_test_error}</span>}
          </span>
        </div>
      )}

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
