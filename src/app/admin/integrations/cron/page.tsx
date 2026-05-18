import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { loadCronSecret } from '@/lib/cron-auth';
import { env } from '@/lib/env';
import { ArrowLeft, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { CronSecretCard } from './CronSecretCard';

export const dynamic = 'force-dynamic';

export default async function CronSetupPage() {
  await loadCronSecret(true);
  const db = createAdminClient();
  const { data: row } = await db.from('cron_settings')
    .select('id, last_rotated_at, last_rotated_by, created_at, updated_at, secret')
    .eq('id', 'singleton').maybeSingle();

  const exists = !!row?.secret;
  const masked = exists
    ? `${(row!.secret as string).slice(0, 6)}…${(row!.secret as string).slice(-6)}`
    : null;
  const envOverride = !!env.CRON_SECRET;
  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Integrations
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <Server className="text-slate-500" />
            Vercel Cron — Secret Management
          </h1>
          <p className="text-gray-600">
            Auto-provisioned shared secret used by all <code>/api/cron/*</code> handlers.
            Cron jobs send <code>Authorization: Bearer &lt;secret&gt;</code>; we accept the
            env var or the DB-stored value, whichever matches.
          </p>
        </div>
        {exists
          ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Active</span>
          : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider"><AlertCircle size={12} /> Missing</span>
        }
      </div>

      <Card>
        <CardHeader><CardTitle>Active secret</CardTitle></CardHeader>
        <CardContent>
          <CronSecretCard
            masked={masked}
            lastRotatedAt={row?.last_rotated_at as string | null ?? null}
            envOverride={envOverride}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Vercel configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            Vercel cron jobs are scheduled in <code>vercel.json</code>. They fire as GET requests
            to the configured paths with no headers — so you need to either:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              Set <code>CRON_SECRET</code> in your Vercel project settings → Environment Variables,
              <strong> using the value above</strong>. The cron-handler verifies the
              <code> Authorization</code> header against this env var.
            </li>
            <li>
              Or skip the env var entirely — the platform falls back to the DB-stored secret,
              and cron jobs can still hit the URLs from any scheduler that signs the request.
            </li>
          </ol>
          <p className="text-xs text-gray-500">
            The 5 scheduled paths in this project are listed below — these are the URLs Vercel calls.
          </p>
          <ul className="text-xs font-mono bg-gray-50 rounded p-3 space-y-0.5 break-all">
            <li>GET {baseUrl}/api/cron/automation?schedule=1</li>
            <li>GET {baseUrl}/api/cron/reports?type=monthly</li>
            <li>GET {baseUrl}/api/cron/reports?type=quarterly</li>
            <li>GET {baseUrl}/api/cron/reports?type=half_yearly</li>
            <li>GET {baseUrl}/api/cron/reports?type=yearly</li>
            <li>GET {baseUrl}/api/cron/action-items</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
