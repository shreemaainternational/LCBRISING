'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, Save, Loader2, CheckCircle2, AlertCircle, Trash2, Beaker,
} from 'lucide-react';

interface Props {
  apiKeyMasked: string | null;
  hasKey: boolean;
  isActive: boolean;
  model: string;
  baseUrl: string;
  monthlyCostCap: number | null;
  lastTestOk: boolean | null;
  lastTestAt: string | null;
  lastTestError: string | null;
  envOverride: boolean;
}

const MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
];

export function OpenAiSettingsForm({
  apiKeyMasked, hasKey, isActive, model, baseUrl, monthlyCostCap,
  lastTestOk, lastTestAt, lastTestError, envOverride,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [chosenModel, setChosenModel] = useState(model);
  const [chosenBaseUrl, setChosenBaseUrl] = useState(baseUrl);
  const [costCap, setCostCap] = useState(monthlyCostCap?.toString() ?? '');
  const [active, setActive] = useState(isActive);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  async function save(test: boolean) {
    setError(null); setNotice(null); setTestResult(null);
    const body: Record<string, unknown> = {
      model: chosenModel,
      base_url: chosenBaseUrl,
      is_active: active,
      test,
    };
    if (apiKey.trim()) body.api_key = apiKey.trim();
    if (costCap) body.monthly_cost_cap_usd = Number(costCap);

    start(async () => {
      const res = await fetch('/api/integrations/openai', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? `HTTP ${res.status}`); return; }
      if (test) {
        setTestResult(j.test?.ok ? 'ok' : 'fail');
        if (j.test?.error) setError(j.test.error);
      } else {
        setNotice(j.settings?.has_key ? 'Saved.' : 'Saved (no key on file).');
      }
      setApiKey('');
      router.refresh();
    });
  }

  function clearKey() {
    if (!confirm('Remove the stored OpenAI API key? AI features will fall back to hand-written templates until you add one again.')) return;
    setError(null);
    start(async () => {
      const res = await fetch('/api/integrations/openai', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_key: true, is_active: false }),
      });
      if (!res.ok) { setError('Failed to clear key.'); return; }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {envOverride && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 inline-flex items-start gap-1.5">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            Env var <code>OPENAI_API_KEY</code> is set on this deployment — it takes
            precedence over the DB-stored key shown below. The DB value is used as a
            fallback only.
          </span>
        </p>
      )}

      <div>
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">API key</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? apiKeyMasked ?? '••••••••' : 'sk-proj-...'}
            className="flex-1 min-w-0 px-3 py-2 rounded-md border bg-white font-mono text-sm" />
          <button type="button" onClick={() => setShowKey((s) => !s)} disabled={pending}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border text-xs font-semibold text-gray-700 hover:bg-gray-50">
            {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
            {showKey ? 'Hide' : 'Show'}
          </button>
          {hasKey && (
            <button type="button" onClick={clearKey} disabled={pending}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-md border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50">
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Get a key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-amber-600 underline">platform.openai.com/api-keys</a>.
          Leave the field blank to keep the existing key and only edit other fields.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Model</span>
          <select value={chosenModel} onChange={(e) => setChosenModel(e.target.value)} disabled={pending}
            className="w-full px-3 py-2 rounded-md border bg-white text-sm">
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Monthly cost cap (USD, optional)</span>
          <input type="number" min={0} step="0.01" value={costCap}
            onChange={(e) => setCostCap(e.target.value)}
            placeholder="e.g. 25.00"
            className="w-full px-3 py-2 rounded-md border bg-white text-sm" />
        </label>
        <label className="block md:col-span-2">
          <span className="block text-xs font-semibold text-gray-700 mb-1">Base URL (only change for Azure or proxy)</span>
          <input type="url" value={chosenBaseUrl} onChange={(e) => setChosenBaseUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-white font-mono text-sm" />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Enable OpenAI features
      </label>

      <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
        <div className="text-xs text-gray-500">
          {lastTestAt ? (
            <>
              {lastTestOk ? <CheckCircle2 size={11} className="inline text-emerald-600 mr-1" />
                : <AlertCircle size={11} className="inline text-rose-600 mr-1" />}
              Last test {lastTestOk ? 'passed' : 'failed'} {new Date(lastTestAt).toLocaleString('en-IN')}
              {lastTestError && <span className="block text-rose-700 text-[10px]">{lastTestError.slice(0, 200)}</span>}
            </>
          ) : <>Not yet tested.</>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => save(true)} disabled={pending}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border text-xs font-semibold text-gray-700 hover:bg-gray-50">
            {pending ? <Loader2 className="animate-spin" size={12} /> : <Beaker size={12} />}
            Test connection
          </button>
          <button type="button" onClick={() => save(false)} disabled={pending}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
            {pending ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      {testResult === 'ok' && (
        <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
          <CheckCircle2 size={11} /> Connection successful — the key works.
        </p>
      )}
      {testResult === 'fail' && (
        <p className="text-xs text-rose-700 inline-flex items-center gap-1">
          <AlertCircle size={11} /> Connection failed — see the error above.
        </p>
      )}
      {notice && (
        <p className="text-xs text-emerald-700 inline-flex items-center gap-1">
          <CheckCircle2 size={11} /> {notice}
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-700 inline-flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
