import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getIntegrationRegistry, summarizeIntegrations } from '@/lib/integrations-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
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
