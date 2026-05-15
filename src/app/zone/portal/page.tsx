import { requireZoneChair } from '@/lib/zone-portal';
import { ZoneTabs } from '../ZoneTabs';
import { isLionsApiConfigured, isOidcConfiguredFlag } from './client-flags';
import { ExternalLink, Shield, Globe, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ZoneLionsPortalPage() {
  const ctx = await requireZoneChair();
  const apiConfigured = isLionsApiConfigured();
  const oidcConfigured = isOidcConfiguredFlag();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">Lions International Portal</h2>
        <p className="text-gray-600 text-sm mt-1">SSO and MyLCI sync surfaces for {ctx.zone.name}.</p>
      </div>
      <ZoneTabs />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Single Sign-On" icon={Shield} configured={oidcConfigured}>
          <p className="text-sm text-gray-600">PKCE-based OIDC flow with MyLCI claim mapping. Sign in once → cross-domain access to Zone Control, CRM and Member Portal.</p>
          <a href="/api/auth/oidc/login?return_to=/zone" className={`mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold ${oidcConfigured ? 'bg-navy-900 text-white hover:bg-navy-800' : 'bg-gray-100 text-gray-400 pointer-events-none'}`}>
            <ExternalLink size={13} /> Sign in with Lions International
          </a>
        </Card>
        <Card title="REST Sync (MyLCI shape)" icon={Globe} configured={apiConfigured}>
          <p className="text-sm text-gray-600">Pull districts → clubs → members from the Lions Member Portal REST API. Falls back to dry-run mode when not configured.</p>
          <a href="/admin/sync/lions" className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border text-sm font-semibold text-gray-800 hover:bg-gray-50">
            <RefreshCw size={13} /> Open Sync Console
          </a>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, configured, children }: {
  title: string; icon: React.ComponentType<{ size?: number }>; configured: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-start justify-between mb-2">
        <h3 className="inline-flex items-center gap-2 font-semibold text-navy-800">
          <span className={configured ? 'text-emerald-600' : 'text-gray-400'}><Icon size={16} /></span>
          {title}
        </h3>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
          configured ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {configured ? 'configured' : 'not set up'}
        </span>
      </div>
      {children}
    </div>
  );
}
