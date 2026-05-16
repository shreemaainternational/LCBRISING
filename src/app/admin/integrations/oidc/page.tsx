import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { isOidcConfigured } from '@/lib/oidc';
import { isLionsApiConfigured } from '@/lib/oidc/lions';
import { env } from '@/lib/env';
import {
  ArrowLeft, Shield, CheckCircle2, XCircle, Globe, AlertCircle, Plug,
} from 'lucide-react';
import { OidcSetupForm } from './OidcSetupForm';
import { LionsApiSetupForm } from './LionsApiSetupForm';

export const dynamic = 'force-dynamic';

export default async function OidcSetupPage() {
  await loadOidcSettings(true);
  await loadLionsApiSettings(true);
  const db = createAdminClient();
  const [{ data: row }, { data: apiRow }] = await Promise.all([
    db.from('lions_oidc_settings').select('*').eq('id', 'singleton').maybeSingle(),
    db.from('lions_api_settings').select('*').eq('id', 'singleton').maybeSingle(),
  ]);

  // never leak secrets to the form
  const initial = row ? { ...row, client_secret: row.client_secret ? '__REDACTED__' : null } : null;
  const apiInitial = apiRow ? {
    ...apiRow,
    api_key: apiRow.api_key ? '__REDACTED__' : null,
    access_token: apiRow.access_token ? '__REDACTED__' : null,
  } : null;
  const configured = isOidcConfigured();
  const apiConfigured = isLionsApiConfigured();
  const defaultRedirect = `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/api/auth/oidc/callback`;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Integrations
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
            <Shield className="text-blue-500" />
            Lions International OIDC SSO
          </h1>
          <p className="text-gray-600">
            Configure the OpenID Connect single-sign-on flow. Settings saved here override the
            corresponding <code>LIONS_OIDC_*</code> env vars at runtime.
          </p>
        </div>
        <StatusBadge ok={configured} />
      </div>

      {row?.last_test_at && (
        <div className={`rounded-md border p-3 text-sm flex items-start gap-2 ${
          row.last_test_ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {row.last_test_ok ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <div>
            <strong>Last discovery test:</strong>{' '}
            {row.last_test_ok ? 'OK' : 'Failed'} ·
            {' ' + new Date(row.last_test_at).toLocaleString('en-IN')}
            {row.last_test_error && <div className="text-xs mt-1 font-mono">{row.last_test_error}</div>}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            OIDC provider settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OidcSetupForm initial={initial} defaultRedirect={defaultRedirect} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className={apiConfigured ? 'text-emerald-600' : 'text-gray-400'}><Plug size={16} /></span>
            Lions REST API (MyLCI sync)
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ml-auto ${
              apiConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {apiConfigured ? 'Active' : 'Not configured'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LionsApiSetupForm initial={apiInitial} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>
            We use OAuth 2.0 Authorization Code flow with PKCE, then verify the ID token
            against the provider&apos;s published JWKS. Lions role claims (<code>club_president</code>,
            <code>district_governor</code>, <code>multiple_district_admin</code>, etc.) are
            mapped onto the corresponding <code>lions_role</code> on the member record.
          </p>
          <p>
            <strong>Redirect URI</strong> — register this exact URL with your identity provider:
            <br />
            <code className="bg-gray-100 px-2 py-1 rounded inline-block mt-1">{defaultRedirect}</code>
          </p>
          <p>
            Once saved + active, the <em>Sign in with Lions International</em> button on the
            login page, zone portal, region portal and integrations panel becomes live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
        <CheckCircle2 size={12} /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
      <XCircle size={12} /> Not configured
    </span>
  );
}
