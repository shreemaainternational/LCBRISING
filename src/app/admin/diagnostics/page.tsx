import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2, XCircle, AlertTriangle, Stethoscope, ArrowLeft, ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ProbeResult {
  ok: boolean;
  detail: string;
  hint?: string;
}

function projectRef(url: string): string {
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? '(unknown)';
}

function mask(s: string | undefined | null, head = 6, tail = 4): string {
  if (!s) return '(unset)';
  if (s.length < head + tail + 4) return '••••••••';
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

async function probeSsrSelect(): Promise<ProbeResult> {
  try {
    const supa = await createClient();
    const { error } = await supa.from('districts').select('id').limit(1);
    if (error) {
      const ms = error.message;
      const hint = /invalid schema/i.test(ms)
        ? 'PostgREST rejected "public". Either add it to API → Exposed schemas in the Supabase Dashboard, or your URL points at a different project than expected.'
        : /invalid api key|jwt/i.test(ms)
          ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY does not belong to the project at NEXT_PUBLIC_SUPABASE_URL. Re-copy the anon key from Supabase → Settings → API and paste in Vercel env.'
          : undefined;
      return { ok: false, detail: ms, hint };
    }
    return { ok: true, detail: 'SSR client read succeeded.' };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

async function probeRpc(): Promise<ProbeResult> {
  try {
    const supa = await createClient();
    const { data, error } = await supa.rpc('ensure_default_district');
    if (error) {
      const ms = error.message;
      const hint = /does not exist|undefined function|404/i.test(ms)
        ? 'Migration 0049_ensure_default_district.sql hasn\'t been applied to the project this URL points at. Apply it in the Supabase SQL editor.'
        : undefined;
      return { ok: false, detail: ms, hint };
    }
    return { ok: true, detail: `RPC returned: ${data ?? '(null)'}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

async function probeAdmin(): Promise<ProbeResult> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, detail: 'SUPABASE_SERVICE_ROLE_KEY is not set in Vercel env.', hint: 'Add it from Supabase → Settings → API → service_role (secret).' };
  }
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('districts').select('id').limit(1);
    if (error) {
      const ms = error.message;
      const hint = /invalid api key|jwt/i.test(ms)
        ? 'SUPABASE_SERVICE_ROLE_KEY does not belong to the project at NEXT_PUBLIC_SUPABASE_URL. Re-copy and update in Vercel env.'
        : undefined;
      return { ok: false, detail: ms, hint };
    }
    return { ok: true, detail: 'Admin client read succeeded.' };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

export default async function DiagnosticsPage() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const ref = projectRef(url);

  const [ssrProbe, rpcProbe, adminProbe] = await Promise.all([
    probeSsrSelect(),
    probeRpc(),
    probeAdmin(),
  ]);

  const allOk = ssrProbe.ok && rpcProbe.ok && adminProbe.ok;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Integrations
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 inline-flex items-center gap-2">
            <Stethoscope className="text-emerald-500" /> Supabase Diagnostics
          </h1>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Confirms which Supabase project the deployment is talking to and
            whether each client tier (SSR, RPC, Admin) is configured correctly.
          </p>
        </div>
        {allOk
          ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> All green</span>
          : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider"><AlertTriangle size={12} /> Issues found</span>
        }
      </div>

      <Card>
        <CardHeader><CardTitle>Current configuration</CardTitle></CardHeader>
        <CardContent>
          <dl className="text-sm divide-y">
            <Row label="NEXT_PUBLIC_SUPABASE_URL" value={url || '(unset)'} mono />
            <Row label="Project ref (extracted)" value={ref} mono />
            <Row label="NEXT_PUBLIC_SUPABASE_ANON_KEY" value={mask(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)} mono />
            <Row label="SUPABASE_SERVICE_ROLE_KEY" value={env.SUPABASE_SERVICE_ROLE_KEY ? mask(env.SUPABASE_SERVICE_ROLE_KEY) : '(not set)'} mono />
          </dl>
          {ref !== '(unknown)' && (
            <a href={`https://supabase.com/dashboard/project/${ref}/settings/api`}
              target="_blank" rel="noopener"
              className="mt-3 inline-flex items-center gap-1 text-xs text-amber-600 hover:underline">
              Open this project&apos;s API settings <ExternalLink size={11} />
            </a>
          )}
        </CardContent>
      </Card>

      <ProbeCard
        title="SSR client (anon key) read"
        description="Tests that NEXT_PUBLIC_SUPABASE_ANON_KEY can reach the project at NEXT_PUBLIC_SUPABASE_URL and PostgREST exposes the public schema."
        result={ssrProbe}
      />
      <ProbeCard
        title="RPC ensure_default_district()"
        description="Confirms migration 0049 is applied on the project this URL points at."
        result={rpcProbe}
      />
      <ProbeCard
        title="Admin client (service-role) read"
        description="Tests that SUPABASE_SERVICE_ROLE_KEY belongs to the same project as the URL."
        result={adminProbe}
      />

      <Card>
        <CardHeader><CardTitle>What each result means</CardTitle></CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>All three green:</strong> Quick Add forms, sandbox-mode toggles,
            cron jobs, AI features, and master sync all work end-to-end.
          </p>
          <p>
            <strong>SSR fails with &quot;Invalid schema&quot;:</strong> The anon key is valid
            but PostgREST doesn&apos;t serve <code>public</code>. Either re-enable
            <code> public</code> in Supabase API settings, or fix the URL to point at
            the right project.
          </p>
          <p>
            <strong>Admin fails with &quot;Invalid API key&quot;:</strong> Service-role key
            doesn&apos;t match the project. Re-copy from Supabase → Settings → API and
            update in Vercel env.
          </p>
          <p>
            <strong>RPC fails with &quot;does not exist&quot;:</strong> Migration 0049 hasn&apos;t
            been applied on the project at this URL. Run it in the SQL editor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-2 gap-4">
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</dt>
      <dd className={`text-sm ${mono ? 'font-mono' : ''} text-navy-800 break-all text-right`}>{value}</dd>
    </div>
  );
}

function ProbeCard({ title, description, result }: { title: string; description: string; result: ProbeResult }) {
  return (
    <Card className={result.ok ? '' : 'border-rose-300'}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {result.ok
            ? <CheckCircle2 size={16} className="text-emerald-600" />
            : <XCircle size={16} className="text-rose-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <p className="text-xs text-gray-500 mb-2">{description}</p>
        <p className={`font-mono text-xs ${result.ok ? 'text-emerald-700' : 'text-rose-700'} break-all`}>
          {result.detail}
        </p>
        {result.hint && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2 inline-flex items-start gap-1.5">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
            <span>{result.hint}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
