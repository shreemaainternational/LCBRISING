import { requireRegionChair } from '@/lib/region-portal';
import { RegionTabs } from '../RegionTabs';
import { isLionsApiConfigured, isOidcConfiguredFlag } from '@/app/zone/portal/client-flags';
import { ExternalLink, Shield, Globe, RefreshCw } from 'lucide-react';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';

export const dynamic = 'force-dynamic';

export default async function RegionPortalPage() {
  const ctx = await requireRegionChair();
  await loadOidcSettings(true);
  const oidc = isOidcConfiguredFlag();
  const api = isLionsApiConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Lions International Portal</h2>
        <p className="text-gray-600 text-sm mt-1">SSO and MyLCI sync for {ctx.region.name}.</p>
      </div>
      <RegionTabs />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="inline-flex items-center gap-2 font-semibold text-navy-800">
            <span className={oidc ? 'text-emerald-600' : 'text-gray-400'}><Shield size={16} /></span>
            Single Sign-On
          </h3>
          <p className="text-sm text-gray-600 mt-2">OIDC sign-in with Lions International credentials.</p>
          {oidc ? (
            <a href="/api/auth/oidc/login?return_to=/region"
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold bg-navy-900 text-white hover:bg-navy-800">
              <ExternalLink size={13} /> Sign in with Lions
            </a>
          ) : (
            <a href="/admin/integrations/oidc"
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white">
              ⚙ Set up OIDC SSO
            </a>
          )}
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="inline-flex items-center gap-2 font-semibold text-navy-800">
            <span className={api ? 'text-emerald-600' : 'text-gray-400'}><Globe size={16} /></span>
            REST Sync
          </h3>
          <p className="text-sm text-gray-600 mt-2">Pull MyLCI districts → zones → clubs → members.</p>
          <a href="/admin/sync/lions" className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border text-sm font-semibold text-gray-800 hover:bg-gray-50">
            <RefreshCw size={13} /> Open Sync Console
          </a>
        </div>
      </div>
    </div>
  );
}
