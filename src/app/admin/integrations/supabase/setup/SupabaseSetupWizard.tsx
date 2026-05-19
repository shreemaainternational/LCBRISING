'use client';
import { useState, useTransition } from 'react';
import {
  Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff, Copy, Terminal,
  ArrowRight, ExternalLink,
} from 'lucide-react';

type ClientResult = { ok: boolean; status?: number; error?: string; code?: string };
type Probe = {
  url: { ok: boolean; error?: string };
  anon: ClientResult;
  serviceRole: ClientResult | null;
  consistent: boolean;
  diagnosis: string | null;
};

export function SupabaseSetupWizard() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [showAnon, setShowAnon] = useState(false);
  const [showSr, setShowSr] = useState(false);
  const [pending, start] = useTransition();
  const [probe, setProbe] = useState<Probe | null>(null);
  const [networkErr, setNetworkErr] = useState<string | null>(null);

  function test() {
    setNetworkErr(null);
    setProbe(null);
    start(async () => {
      try {
        const res = await fetch('/api/integrations/health/supabase/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim(), anonKey: anonKey.trim(), serviceRoleKey: serviceRoleKey.trim() }),
        });
        const j = await res.json().catch(() => null);
        if (!res.ok) {
          setNetworkErr(j?.error ?? `Probe failed (HTTP ${res.status})`);
          return;
        }
        setProbe(j);
      } catch (e) {
        setNetworkErr(e instanceof Error ? e.message : 'Network error');
      }
    });
  }

  const cli = buildVercelCli({ url: url.trim(), anonKey: anonKey.trim(), serviceRoleKey: serviceRoleKey.trim() });

  const ready = url && anonKey;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-navy-900 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 text-xs font-bold">1</span>
          Get the three values from Supabase
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Open{' '}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-0.5 font-medium text-amber-700 hover:underline"
          >
            supabase.com/dashboard <ExternalLink size={11} />
          </a>{' '}
          → your project → <strong>Project Settings</strong> → <strong>API</strong>. Copy all three
          fields from that single page so they&apos;re guaranteed to belong to the same project. Click
          <em> Reveal </em> before copying the service-role key.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-navy-900 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 text-xs font-bold">2</span>
          Paste them here to validate
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Values are sent once to the server, used to probe Supabase, and discarded.
          Nothing is persisted in the database or browser storage.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Project URL" hint="https://<ref>.supabase.co">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </Field>

          <Field label="Anon (public) key" hint="JWT — starts with eyJ…">
            <div className="relative">
              <input
                type={showAnon ? 'text' : 'password'}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOi…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowAnon((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showAnon ? 'Hide' : 'Show'}
              >
                {showAnon ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <Field label="Service-role (secret) key" hint="Optional but recommended — JWT, bypasses RLS">
            <div className="relative">
              <input
                type={showSr ? 'text' : 'password'}
                value={serviceRoleKey}
                onChange={(e) => setServiceRoleKey(e.target.value)}
                placeholder="eyJhbGciOi…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowSr((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showSr ? 'Hide' : 'Show'}
              >
                {showSr ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <button
            type="button"
            onClick={test}
            disabled={!ready || pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            {pending ? 'Probing…' : 'Test against Supabase'}
          </button>

          {networkErr && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {networkErr}
            </div>
          )}

          {probe && (
            <div className="space-y-2 pt-1">
              <div
                className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
                  probe.consistent
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border border-rose-200 bg-rose-50 text-rose-900'
                }`}
              >
                {probe.consistent ? (
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                )}
                <div className="font-semibold">
                  {probe.consistent
                    ? 'All keys match this project. Continue to step 3.'
                    : probe.diagnosis ?? 'Probe failed'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Pill label="URL" r={probe.url.ok ? { ok: true } : { ok: false, error: probe.url.error }} />
                <Pill label="Anon" r={probe.anon} />
                {probe.serviceRole && <Pill label="Service role" r={probe.serviceRole} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {probe?.consistent && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-navy-900 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 text-xs font-bold">3</span>
            Save to Vercel
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Run these commands locally where the Vercel CLI is linked to your project
            (<code className="text-xs bg-white px-1 rounded border">vercel login</code> then{' '}
            <code className="text-xs bg-white px-1 rounded border">vercel link</code> if you haven&apos;t).
            Or paste each <code className="text-xs bg-white px-1 rounded border">Key=Value</code> pair into
            Vercel → Settings → Environment Variables.
          </p>

          <CliBlock label="Vercel CLI (one-shot)" snippet={cli.cli} />
          <CliBlock label="Plain KEY=VALUE (for the dashboard UI)" snippet={cli.dotenv} />

          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <strong>After saving:</strong> trigger a redeploy with cache disabled —{' '}
            <code className="bg-white px-1 rounded border">vercel --prod --force</code> — or in
            the Vercel UI: Deployments → ⋯ → Redeploy → uncheck &ldquo;Use existing build cache&rdquo;.
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">{label}</span>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Pill({ label, r }: { label: string; r: { ok: boolean; status?: number; error?: string; code?: string } }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        r.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
      }`}
    >
      <div className={`text-[10px] uppercase tracking-wider font-bold ${r.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
        {label}
      </div>
      <div className={`text-xs mt-0.5 ${r.ok ? 'text-emerald-900' : 'text-rose-900'}`}>
        {r.ok ? 'OK' : r.code ?? `error${r.status ? ` (${r.status})` : ''}`}
      </div>
      {r.error && !r.ok && (
        <div className="mt-1 text-[10px] font-mono break-all text-rose-700/80">{r.error}</div>
      )}
    </div>
  );
}

function CliBlock({ label, snippet }: { label: string; snippet: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-700 inline-flex items-center gap-1">
          <Terminal size={11} /> {label}
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(snippet).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            });
          }}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50"
        >
          <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-navy-900 px-3 py-3 text-[11px] text-amber-100 font-mono leading-relaxed">
{snippet}
      </pre>
    </div>
  );
}

function buildVercelCli({ url, anonKey, serviceRoleKey }: { url: string; anonKey: string; serviceRoleKey?: string }) {
  const envs = ['production', 'preview', 'development'];
  const cliLines: string[] = ['# Run in your project root after `vercel link`:'];
  for (const e of envs) {
    cliLines.push(`printf '%s' '${url}' | vercel env add NEXT_PUBLIC_SUPABASE_URL ${e} --force`);
    cliLines.push(`printf '%s' '${anonKey}' | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY ${e} --force`);
    if (serviceRoleKey) {
      cliLines.push(`printf '%s' '${serviceRoleKey}' | vercel env add SUPABASE_SERVICE_ROLE_KEY ${e} --force`);
    }
  }
  cliLines.push('vercel --prod --force');

  const dotenv = [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    serviceRoleKey ? `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}` : null,
  ].filter(Boolean).join('\n');

  return { cli: cliLines.join('\n'), dotenv };
}
