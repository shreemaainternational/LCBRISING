/**
 * POST /api/integrations/health/supabase
 *
 * Live probe of both Supabase clients. Used by the "Test connection"
 * button on /admin/integrations so an operator can self-diagnose
 * URL/key mismatch without leaving the CRM.
 *
 * Forces a fresh check (bypasses the 30s health cache) and resets
 * the service-role circuit breaker so a re-deploy with fixed env
 * doesn't have to wait for the breaker to expire.
 */
import { NextResponse } from 'next/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { checkSupabaseHealth, diagnoseSupabase } from '@/lib/supabase/health';
import { clearServiceRoleStatus } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const actor = await requirePermission('integration.manage');
  if (isGuardFailure(actor)) return actor;
  clearServiceRoleStatus();
  const health = await checkSupabaseHealth(true);
  return NextResponse.json({
    ok: health.consistent,
    diagnosis: diagnoseSupabase(health),
    url: health.url,
    anon: health.anon,
    serviceRole: health.serviceRole,
    reachable: health.reachable,
    consistent: health.consistent,
    checkedAt: new Date().toISOString(),
  });
}

// Convenience for the integrations page initial render.
export async function GET() {
  const actor = await requirePermission('integration.manage');
  if (isGuardFailure(actor)) return actor;
  const health = await checkSupabaseHealth();
  return NextResponse.json({
    ok: health.consistent,
    diagnosis: diagnoseSupabase(health),
    anon: health.anon,
    serviceRole: health.serviceRole,
  });
}
