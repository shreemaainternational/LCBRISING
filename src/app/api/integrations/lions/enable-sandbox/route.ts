import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateOidcSettingsCache, loadOidcSettings } from '@/lib/oidc/runtime-config';
import { invalidateLionsApiCache, loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/lions/enable-sandbox
 *
 * One-click that flips both Lions singletons (OIDC + REST API) to
 * sandbox mode. Implemented as a SECURITY DEFINER RPC so it works
 * without SUPABASE_SERVICE_ROLE_KEY and even when the caller is the
 * synthetic admin (lcbr_crm cookie, no real auth.uid()). Requires
 * migration 0050_enable_lions_sandbox_rpc.sql.
 */
export async function POST() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }

  // Prefer SSR + RPC — no service role required.
  const supa = await createClient();
  const { data, error } = await supa.rpc('enable_lions_sandbox');

  if (error && /does not exist|undefined function|404/i.test(error.message)) {
    return NextResponse.json({
      error: 'Sandbox toggle requires migration 0050_enable_lions_sandbox_rpc.sql. Apply it in your Supabase SQL editor.',
    }, { status: 500 });
  }

  // Last-resort admin fallback for projects where the RPC path is blocked.
  if (error) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        error: `Sandbox enable failed: ${error.message}. Apply migration 0050 in Supabase, or set SUPABASE_SERVICE_ROLE_KEY.`,
      }, { status: 500 });
    }
    try {
      const admin = createAdminClient();
      const now = new Date().toISOString();
      await admin.from('lions_oidc_settings').upsert({
        id: 'singleton',
        is_active: true,
        sandbox_mode: true,
        provider_label: 'Lions International (sandbox)',
        scopes: 'openid profile email lions.member',
        configured_at: now,
      }, { onConflict: 'id' });
      await admin.from('lions_api_settings').upsert({
        id: 'singleton', is_active: true, sandbox_mode: true, configured_at: now,
      }, { onConflict: 'id' });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  invalidateOidcSettingsCache();
  invalidateLionsApiCache();
  await Promise.all([loadOidcSettings(true), loadLionsApiSettings(true)]);

  return NextResponse.json({ ok: true, result: data ?? { fallback: 'admin' } });
}
