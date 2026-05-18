import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateOidcSettingsCache, loadOidcSettings } from '@/lib/oidc/runtime-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const upsertSchema = z.object({
  issuer: z.string().url().optional().or(z.literal('')),
  client_id: z.string().optional().or(z.literal('')),
  client_secret: z.string().optional(),
  redirect_uri: z.string().url().optional().or(z.literal('')),
  scopes: z.string().default('openid profile email'),
  audience: z.string().optional(),
  provider_label: z.string().default('Lions International'),
  discovery_url: z.string().url().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  sandbox_mode: z.boolean().default(false),
  test: z.boolean().default(true),
}).refine(
  (v) => v.sandbox_mode || (v.issuer && v.client_id && v.redirect_uri),
  { message: 'Issuer, Client ID and Redirect URI are required unless sandbox mode is enabled.' },
);

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const db = createAdminClient();
  const { data } = await db.from('lions_oidc_settings').select('*').eq('id', 'singleton').maybeSingle();
  // never leak the secret to the client
  if (data) {
    return NextResponse.json({
      settings: { ...data, client_secret: data.client_secret ? '__REDACTED__' : null },
    });
  }
  return NextResponse.json({ settings: null });
}

export async function PUT(req: Request) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; }

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();

  // Preserve existing secret when caller sends a sentinel placeholder.
  let clientSecret: string | undefined = parsed.data.client_secret;
  if (clientSecret === '__REDACTED__' || clientSecret === undefined) {
    const { data: existing } = await db.from('lions_oidc_settings').select('client_secret').eq('id', 'singleton').maybeSingle();
    clientSecret = existing?.client_secret ?? clientSecret;
  }

  // Optionally probe the discovery document so we fail fast on bad
  // issuer / redirect URI. Sandbox mode skips the probe.
  let testOk: boolean | null = null;
  let testError: string | null = null;
  if (parsed.data.test && !parsed.data.sandbox_mode && parsed.data.issuer) {
    const url = parsed.data.discovery_url
      || `${parsed.data.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) {
        testOk = false; testError = `discovery_failed:${res.status}`;
      } else {
        const doc = await res.json() as { authorization_endpoint?: string; token_endpoint?: string };
        if (!doc.authorization_endpoint || !doc.token_endpoint) {
          testOk = false; testError = 'discovery_missing_endpoints';
        } else {
          testOk = true;
        }
      }
    } catch (e) {
      testOk = false; testError = String(e);
    }
  }

  const payload = {
    id: 'singleton' as const,
    issuer: parsed.data.issuer || null,
    client_id: parsed.data.client_id || null,
    client_secret: clientSecret ?? null,
    redirect_uri: parsed.data.redirect_uri || null,
    scopes: parsed.data.scopes,
    audience: parsed.data.audience ?? null,
    provider_label: parsed.data.provider_label,
    discovery_url: parsed.data.discovery_url || null,
    is_active: parsed.data.is_active,
    sandbox_mode: parsed.data.sandbox_mode,
    configured_by: actor?.id ?? null,
    configured_at: new Date().toISOString(),
    last_test_ok: testOk,
    last_test_at: parsed.data.test ? new Date().toISOString() : null,
    last_test_error: testError,
  };

  const { data, error } = await db.from('lions_oidc_settings')
    .upsert(payload, { onConflict: 'id' })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateOidcSettingsCache();
  await loadOidcSettings(true);

  return NextResponse.json({
    ok: true,
    settings: { ...data, client_secret: data.client_secret ? '__REDACTED__' : null },
    test: { ok: testOk, error: testError },
  });
}

export async function DELETE() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  await createAdminClient().from('lions_oidc_settings').update({ is_active: false }).eq('id', 'singleton');
  invalidateOidcSettingsCache();
  return NextResponse.json({ ok: true });
}
