'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, AlertCircle, CheckCircle2, Trash2, KeyRound } from 'lucide-react';

interface PortalSettingsRow {
  username: string | null;
  password: string | null;
  login_url: string | null;
  data_url: string | null;
  district_code: string | null;
  is_active: boolean;
  sandbox_mode?: boolean;
  last_login_ok?: boolean | null;
  last_login_at?: string | null;
  last_login_error?: string | null;
  last_sync_at?: string | null;
}

export function LionsPortalSetupForm({ initial }: { initial: PortalSettingsRow | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [username, setUsername] = useState(initial?.username && initial.username !== '__REDACTED__' ? initial.username : '');
  const [password, setPassword] = useState('');
  const [loginUrl, setLoginUrl] = useState(initial?.login_url ?? '');
  const [dataUrl, setDataUrl] = useState(initial?.data_url ?? '');
  const [districtCode, setDistrictCode] = useState(initial?.district_code ?? '');
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sandboxMode, setSandboxMode] = useState(initial?.sandbox_mode ?? false);
  const [test, setTest] = useState(true);

  function save() {
    setResult(null);
    if (!sandboxMode && (!loginUrl.trim() || !dataUrl.trim())) {
      setResult({ ok: false, msg: 'Login URL and Data URL are required (or enable sandbox mode).' });
      return;
    }
    start(async () => {
      const res = await fetch('/api/integrations/lions-portal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username || undefined,
          password: password || undefined,
          login_url: loginUrl,
          data_url: dataUrl,
          district_code: districtCode || undefined,
          is_active: isActive,
          sandbox_mode: sandboxMode,
          test,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setResult({ ok: false, msg: j.error ?? `HTTP ${res.status}` }); return; }
      const info = j.test;
      if (info?.ok === false) setResult({ ok: false, msg: `Saved, but login test failed: ${info.error}` });
      else if (info?.ok === true) setResult({ ok: true, msg: 'Saved and login verified against the token endpoint.' });
      else setResult({ ok: true, msg: 'Saved.' });
      setPassword('');
      router.refresh();
    });
  }

  function deactivate() {
    if (!confirm('Deactivate DG portal sync? District sync will fall back to the REST adapter / dry-run.')) return;
    start(async () => {
      await fetch('/api/integrations/lions-portal', { method: 'DELETE' });
      setResult({ ok: true, msg: 'Deactivated.' });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900">
        <div className="font-semibold mb-1 inline-flex items-center gap-1.5">
          <KeyRound size={12} /> About this integration
        </div>
        <p>
          Auto-syncs <strong>district data</strong> using a District Governor&apos;s Lions
          Member Portal login. The username &amp; password are <strong>encrypted at rest</strong> and
          exchanged for a session at the login/token endpoint, then district data is pulled
          from the data endpoint and mapped onto the districts table. Falls back to the REST
          adapter or dry-run when not configured.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="DG portal username / email *">
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            className={cls} autoComplete="off"
            placeholder={initial?.username === '__REDACTED__' ? '••••••• (saved — retype to change)' : 'dg@example.org'} />
        </Field>
        <Field label="DG portal password *">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className={cls} autoComplete="new-password"
            placeholder={initial?.password === '__REDACTED__' ? '••••••• (saved — leave blank to keep)' : 'Password'} />
        </Field>
        <Field label="Login / token endpoint *" full>
          <input value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)}
            className={cls} placeholder="https://gateway.example.org/lions/login" />
        </Field>
        <Field label="District data endpoint *" full>
          <input value={dataUrl} onChange={(e) => setDataUrl(e.target.value)}
            className={cls} placeholder="https://gateway.example.org/lions/districts" />
        </Field>
        <Field label="District code (optional scope)">
          <input value={districtCode} onChange={(e) => setDistrictCode(e.target.value)}
            className={cls} placeholder="3232 F1" />
        </Field>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} />
            Verify login on save
          </label>
        </div>
        <div className="md:col-span-2 rounded-md border-2 border-dashed border-purple-300 bg-purple-50/40 p-3">
          <label className="inline-flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={sandboxMode}
              onChange={(e) => setSandboxMode(e.target.checked)} className="mt-0.5" />
            <span className="text-sm">
              <span className="font-semibold text-purple-800">Sandbox mode</span>
              <span className="inline-block ml-2 text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full">
                no login needed
              </span>
              <p className="text-xs text-purple-700/90 mt-1 leading-snug">
                Returns a synthetic Portal-shaped district record so you can exercise the
                district sync without live DG credentials.
              </p>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t">
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {pending ? 'Saving…' : 'Save & Activate'}
        </button>
        {initial?.is_active && (
          <button type="button" onClick={deactivate} disabled={pending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-rose-700 hover:bg-rose-50">
            <Trash2 size={13} /> Deactivate
          </button>
        )}
      </div>

      {initial?.last_login_at && (
        <div className={`text-xs px-3 py-2 rounded border inline-flex items-start gap-1.5 ${
          initial.last_login_ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {initial.last_login_ok ? <CheckCircle2 size={12} className="mt-0.5" /> : <AlertCircle size={12} className="mt-0.5" />}
          <span>
            <strong>Last login:</strong> {initial.last_login_ok ? 'OK' : 'Failed'} ·
            {' ' + new Date(initial.last_login_at).toLocaleString('en-IN')}
            {initial.last_login_error && <span className="block mt-1 font-mono">{initial.last_login_error}</span>}
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
