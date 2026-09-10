import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Globe, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import { isLionsApiConfigured, getLionsApiConfig } from '@/lib/oidc/lions';
import { isLionsPortalConfigured } from '@/lib/oidc/lions-portal';
import { isOidcConfigured } from '@/lib/oidc';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { loadLionsPortalSettings } from '@/lib/oidc/lions-portal-runtime';
import { LionsSyncPanel } from './LionsSyncPanel';
import { AutoSyncPanel } from './AutoSyncPanel';
import { DistrictPortalUpload } from '@/components/admin/DistrictPortalUpload';
import { getAutoSyncState } from '@/lib/sync/lions-auto';
import { getAutomationSettings } from '@/lib/automation/settings';
import { Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LionsSyncPage() {
  await Promise.all([loadOidcSettings(true), loadLionsApiSettings(true), loadLionsPortalSettings(true)]);
  const apiConfigured = isLionsApiConfigured();
  const apiConfig = apiConfigured ? getLionsApiConfig() : null;
  const oidcConfigured = isOidcConfigured();
  const portalConfigured = isLionsPortalConfigured();
  const [autoState, automation] = await Promise.all([getAutoSyncState(), getAutomationSettings()]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-sm">OIDC Single Sign-On</span>
              {oidcConfigured
                ? <CheckCircle2 size={14} className="text-green-600" />
                : <XCircle size={14} className="text-gray-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status">
              {oidcConfigured
                ? <span className="text-green-700 font-medium">Configured</span>
                : <span className="text-gray-500">Not configured</span>}
            </Row>
            <p className="text-xs text-gray-500">
              Required env: <code>LIONS_OIDC_ISSUER</code>, <code>LIONS_OIDC_CLIENT_ID</code>,
              <code>LIONS_OIDC_REDIRECT_URI</code>. PKCE-based authorization code flow with
              discovery, JWKS verification and Lions role claim mapping (MJF / PMJF / club
              officer / district governor / multiple district admin).
            </p>
            <a
              href="/api/auth/oidc/login?return_to=/admin"
              className={`inline-block px-4 py-2 rounded-md text-sm font-medium ${oidcConfigured ? 'bg-navy-900 text-white hover:bg-navy-800' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}
            >
              Sign in with Lions International
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-sm">REST Sync Adapter</span>
              {apiConfigured
                ? <CheckCircle2 size={14} className="text-green-600" />
                : <XCircle size={14} className="text-gray-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status">
              {apiConfigured
                ? <span className="text-green-700 font-medium">Configured</span>
                : <span className="text-gray-500">Dry-run mode</span>}
            </Row>
            {apiConfig && <>
              <Row label="Base URL">{apiConfig.baseUrl}</Row>
              {apiConfig.districtCode && <Row label="District">{apiConfig.districtCode}</Row>}
              {apiConfig.multipleDistrictCode && <Row label="Multi-District">{apiConfig.multipleDistrictCode}</Row>}
            </>}
            <p className="text-xs text-gray-500">
              Required env: <code>LIONS_API_BASE_URL</code>. Optional:
              <code>LIONS_API_KEY</code> / <code>LIONS_API_ACCESS_TOKEN</code>,
              <code>LIONS_API_DISTRICT_CODE</code>, <code>LIONS_API_MULTI_DISTRICT_CODE</code>.
              The adapter is shape-compatible with MyLCI-style payloads.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-sm">District Governor Portal Login</span>
              {portalConfigured
                ? <CheckCircle2 size={14} className="text-green-600" />
                : <XCircle size={14} className="text-gray-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Status">
              {portalConfigured
                ? <span className="text-green-700 font-medium">Configured</span>
                : <span className="text-gray-500">Not configured</span>}
            </Row>
            <p className="text-xs text-gray-500">
              Auto-syncs district data using an encrypted District Governor login. The stored
              username &amp; password are exchanged for a session at the login/token endpoint,
              then district data is mapped onto the districts table. Configure it on the{' '}
              <a href="/admin/integrations/oidc" className="text-amber-700 hover:underline">integrations</a> page.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> Automated sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600">
            Fetches districts, clubs &amp; members from the Lions Portal on a daily schedule and updates
            the system automatically — then runs an AI duplicate scan to flag merged-member candidates.
            Configure the schedule &amp; toggles on the{' '}
            <a href="/admin/automation" className="text-amber-700 hover:underline">Automation</a> page.
          </p>
          <AutoSyncPanel
            enabled={automation.lions_auto_sync_enabled}
            scheduleLabel="Daily · 01:00"
            initialState={autoState}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Run Sync manually</CardTitle></CardHeader>
        <CardContent>
          <LionsSyncPanel apiConfigured={apiConfigured} portalConfigured={portalConfigured} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin size={16} className="text-amber-500" /> Upload district data (portal export)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            No API? Download your district report from the{' '}
            <a href="https://lionsinternational.my.site.com/s/" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">Lions Member Portal</a>{' '}
            as Excel / CSV and upload it here to sync district data.
          </p>
          <DistrictPortalUpload />
        </CardContent>
      </Card>

      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer font-medium">Expected REST shapes</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2 text-xs">
          <div>
            <strong>GET /districts</strong>
            <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{`[
  { "district_code": "3232 F1", "name": "...", "governor_name": "...", "lions_year": "2025-26" }
]`}</pre>
          </div>
          <div>
            <strong>GET /districts/&lt;code&gt;/clubs</strong>
            <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{`[
  { "club_id": "12345", "name": "...", "district_code": "3232 F1",
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
          <div>
            <strong>DG login — POST login/token endpoint</strong>
            <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{`// request
{ "username": "...", "password": "..." }
// response (any of these token keys)
{ "access_token": "...", "expires_in": 3600 }`}</pre>
          </div>
          <div>
            <strong>DG login — GET district data endpoint</strong>
            <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">{`[
  { "district_code": "3232 F1", "name": "...", "multiple_district_code": "323",
    "status": "Active", "governor_name": "...", "club_count": 62,
    "member_count": 1840, "region_count": 4, "zone_count": 11 }
]`}</pre>
          </div>
        </div>
      </details>
    </div>
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
