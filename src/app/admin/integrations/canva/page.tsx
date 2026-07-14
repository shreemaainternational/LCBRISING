import Link from 'next/link';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadCanvaRuntime } from '@/lib/canva/config';
import { env } from '@/lib/env';
import { ArrowLeft, Palette, CheckCircle2, AlertCircle } from 'lucide-react';
import { CanvaConnectForm } from './CanvaConnectForm';

export const dynamic = 'force-dynamic';

export default async function CanvaSetupPage() {
  const runtime = await loadCanvaRuntime(true);

  const envClientCreds = !!(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET);
  const envStaticToken = !!env.CANVA_API_KEY;
  const live = runtime.connected;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Integrations
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 inline-flex items-center gap-2">
            <Palette className="text-cyan-500" />
            Canva — Branded Creatives
          </h1>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Connect a Canva account so the Creative Builder (<code>/admin/creative</code>) and the
            daily automation engine can autofill your brand templates (flyers, invitations,
            certificates, social posts) and export them as PNG/PDF. Uses the Canva Connect API
            over OAuth 2.0 — the token refreshes itself, so you connect once.
          </p>
        </div>
        {live
          ? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Connected</span>
          : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider"><AlertCircle size={12} /> Not connected</span>
        }
      </div>

      <Card>
        <CardHeader><CardTitle>Connection</CardTitle></CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
          <CanvaConnectForm
            connected={runtime.connected}
            source={runtime.source}
            hasClientCreds={runtime.hasClientCreds}
            scope={runtime.scope}
            accessTokenExpiresAt={runtime.accessTokenExpiresAt}
            connectedAt={runtime.connectedAt}
            lastError={runtime.lastError}
            envClientCreds={envClientCreds}
            envStaticToken={envStaticToken}
          />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Setup checklist</CardTitle></CardHeader>
        <CardContent>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal pl-5">
            <li>
              Create a Connect integration at{' '}
              <a className="text-cyan-700 hover:underline" href="https://www.canva.com/developers/integrations/connect-api" target="_blank" rel="noreferrer">
                canva.com/developers
              </a>. Add the scopes: <code>design:content:read/write</code>, <code>design:meta:read</code>,{' '}
              <code>brandtemplate:meta:read</code>, <code>brandtemplate:content:read</code>,{' '}
              <code>asset:read/write</code>, <code>profile:read</code>.
            </li>
            <li>
              Set the redirect URL to{' '}
              <code>{env.CANVA_REDIRECT_URI ?? '<your-domain>/api/canva/oauth/callback'}</code>.
            </li>
            <li>Paste the client ID &amp; secret below (or set <code>CANVA_CLIENT_ID</code> / <code>CANVA_CLIENT_SECRET</code> in env), then click <strong>Connect Canva</strong>.</li>
            <li>
              Publish your brand templates and map their IDs via the{' '}
              <code>CANVA_TEMPLATE_*</code> env vars (see <code>src/templates/config.ts</code>).
            </li>
          </ol>
          <p className="text-xs text-gray-500 mt-4">
            Everything degrades gracefully when Canva is off — the Creative Builder still generates
            text; only the &ldquo;Generate Design&rdquo; step needs this connection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
