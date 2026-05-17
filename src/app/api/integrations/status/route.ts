import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getIntegrationRegistry, summarizeIntegrations } from '@/lib/integrations-registry';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';
import { loadCronSecret } from '@/lib/cron-auth';
import { loadVapidConfig } from '@/lib/push-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  await Promise.all([loadOidcSettings(true), loadLionsApiSettings(true), loadCronSecret(true), loadVapidConfig(true)]);
  const registry = getIntegrationRegistry();
  const safeRegistry = registry.map((r) => ({
    key: r.key,
    name: r.name,
    category: r.category,
    description: r.description,
    configured: r.configured,
    docsHref: r.docsHref,
    adminHref: r.adminHref,
    whenMissing: r.whenMissing,
    envVars: r.envVars.map((e) => ({
      name: e.name, required: e.required, public: !!e.public, hint: e.hint,
    })),
  }));
  return NextResponse.json({
    summary: summarizeIntegrations(),
    integrations: safeRegistry,
  });
}
