import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Globe, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { isLionsApiConfigured, getLionsApiConfig, isLionsApiSandboxActive } from '@/lib/oidc/lions';
import { isOidcConfigured } from '@/lib/oidc';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { LionsSyncPanel } from './LionsSyncPanel';

export const dynamic = 'force-dynamic';

export default async function LionsSyncPage() {
  await Promise.all([loadOidcSettings(true), loadLionsApiSettings(true)]);
  const apiConfigured = isLionsApiConfigured();
  const apiConfig = apiConfigured ? getLionsApiConfig() : null;
  const sandbox = isLionsApiSandboxActive();
  const oidcConfigured = isOidcConfigured();

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/sync" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Sync
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
          <Globe className="text-blue-500" /> Lions International Integration
        </h1>
        <p className="text-gray-600">
          Sign in via the Lions identity provider and synchronize member, club,
          district and award data from the Lions Member Portal / MyLCI APIs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="text-sm">OIDC Single Sign-On</span>
              <StatusBadge ok={oidcConfigured} okLabel="Live" offLabel="Not configured" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs text-gray-500">
              Required env: <code>LIONS_OIDC_ISSUER</code>, <code>LIONS_OIDC_CLIENT_ID</code>,
              {' '}<code>LIONS_OIDC_REDIRECT_URI</code>. PKCE authorization-code flow with
              discovery, JWKS verification and Lions role-claim mapping (MJF / PMJF / club
              officer / district governor / multiple-district admin).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {oidcConfigured ? (
                <a
                  href="/api/auth/oidc/login?return_to=/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-navy-900 text-white hover:bg-navy-800"
                >
                  Sign in with Lions International
                </a>
              ) : (
                <Link
                  href="/admin/integrations/oidc"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-amber-500 text-white hover:bg-amber-600"
                >
                  <Settings size={14} /> Configure OIDC
                </Link>
              )}
              <Link
                href="/admin/integrations/oidc"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50"
              >
                <Settings size={14} /> Settings
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="text-sm">REST Sync Adapter</span>
              <StatusBadge
                ok={apiConfigured}
                okLabel={sandbox ? 'Sandbox' : 'Live'}
                offLabel="Dry-run"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {apiConfig && (
              <div className="space-y-1.5 pb-1 border-b border-gray-100">
                <Row label="Base URL"><code className="text-xs">{apiConfig.baseUrl}</code></Row>
                {apiConfig.districtCode && <Row label="District">{apiConfig.districtCode}</Row>}
                {apiConfig.multipleDistrictCode && <Row label="Multi-District">{apiConfig.multipleDistrictCode}</Row>}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Required env: <code>LIONS_API_BASE_URL</code>. Optional:
              {' '}<code>LIONS_API_KEY</code> / <code>LIONS_API_ACCESS_TOKEN</code>,
              {' '}<code>LIONS_API_DISTRICT_CODE</code>, <code>LIONS_API_MULTI_DISTRICT_CODE</code>.
              The adapter is shape-compatible with MyLCI-style payloads.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/admin/integrations/oidc"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${
                  apiConfigured
                    ? 'text-gray-700 border border-gray-300 bg-white hover:bg-gray-50'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                <Settings size={14} /> {apiConfigured ? 'Settings' : 'Configure REST'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Run Sync</CardTitle></CardHeader>
        <CardContent>
          <LionsSyncPanel apiConfigured={apiConfigured} sandbox={sandbox} />
        </CardContent>
      </Card>

      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer font-medium">Expected REST shapes</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2 text-xs">
          <div>
            <strong>GET /districts</strong>
            <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{`[
  { "district_code": "3232 FI", "name": "...", "governor_name": "...", "lions_year": "2025-26" }
]`}</pre>
          </div>
          <div>
            <strong>GET /districts/&lt;code&gt;/clubs</strong>
            <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{`[
  { "club_id": "12345", "name": "...", "district_code": "3232 FI",
    "city": "Vadodara", "state": "Gujarat", "country": "India",
    "charter_date": "2010-04-15" }
]`}</pre>
          </div>
          <div className="md:col-span-2">
            <strong>GET /clubs/&lt;club_id&gt;/members</strong>
            <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{`[
  { "member_id": "98765", "email": "...", "first_name": "...", "last_name": "...",
    "phone": "+91...", "status": "Active", "club_id": "12345",
    "joined_at": "2020-07-01", "roles": ["lci.role.club_secretary"] }
]`}</pre>
          </div>
        </div>
      </details>
    </div>
  );
}

function StatusBadge({ ok, okLabel, offLabel }: { ok: boolean; okLabel: string; offLabel: string }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={11} /> {okLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
      <AlertCircle size={11} /> {offLabel}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{children}</span>
    </div>
  );
}
