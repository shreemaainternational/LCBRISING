import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateLionsApiCache, loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const upsertSchema = z.object({
  base_url: z.string().url().optional().or(z.literal('')),
  api_key: z.string().optional(),
  access_token: z.string().optional(),
  district_code: z.string().max(32).optional(),
  multi_district_code: z.string().max(32).optional(),
  is_active: z.boolean().default(true),
  sandbox_mode: z.boolean().default(false),
  test: z.boolean().default(true),
}).refine((v) => v.sandbox_mode || !!v.base_url, {
  message: 'Base URL is required unless sandbox mode is enabled.',
});

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { data } = await createAdminClient().from('lions_api_settings').select('*').eq('id', 'singleton').maybeSingle();
  if (data) {
    return NextResponse.json({
      settings: {
        ...data,
        api_key: data.api_key ? '__REDACTED__' : null,
        access_token: data.access_token ? '__REDACTED__' : null,
      },
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

  let apiKey: string | undefined = parsed.data.api_key;
  let accessToken: string | undefined = parsed.data.access_token;
  if (apiKey === '__REDACTED__' || accessToken === '__REDACTED__' || apiKey === undefined || accessToken === undefined) {
    const { data: existing } = await db.from('lions_api_settings').select('api_key, access_token').eq('id', 'singleton').maybeSingle();
    if (apiKey === '__REDACTED__' || apiKey === undefined) apiKey = existing?.api_key ?? apiKey;
    if (accessToken === '__REDACTED__' || accessToken === undefined) accessToken = existing?.access_token ?? accessToken;
  }

  let testOk: boolean | null = null;
  let testError: string | null = null;
  if (parsed.data.test && !parsed.data.sandbox_mode && parsed.data.base_url) {
    try {
      const url = `${parsed.data.base_url.replace(/\/$/, '')}/districts`;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (apiKey) headers['X-API-Key'] = apiKey;
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch(url, { headers, cache: 'no-store' });
      testOk = res.ok;
      if (!res.ok) testError = `HTTP ${res.status}`;
    } catch (e) { testOk = false; testError = String(e); }
  }

  const payload = {
    id: 'singleton' as const,
    base_url: parsed.data.base_url || null,
    api_key: apiKey ?? null,
    access_token: accessToken ?? null,
    district_code: parsed.data.district_code ?? null,
    multi_district_code: parsed.data.multi_district_code ?? null,
    is_active: parsed.data.is_active,
    sandbox_mode: parsed.data.sandbox_mode,
    configured_by: actor?.id ?? null,
    configured_at: new Date().toISOString(),
    last_test_ok: testOk,
    last_test_at: parsed.data.test ? new Date().toISOString() : null,
    last_test_error: testError,
  };

  const { data, error } = await db.from('lions_api_settings')
    .upsert(payload, { onConflict: 'id' })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateLionsApiCache();
  await loadLionsApiSettings(true);

  return NextResponse.json({
    ok: true,
    settings: {
      ...data,
      api_key: data.api_key ? '__REDACTED__' : null,
      access_token: data.access_token ? '__REDACTED__' : null,
    },
    test: { ok: testOk, error: testError },
  });
}

export async function DELETE() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  await createAdminClient().from('lions_api_settings').update({ is_active: false }).eq('id', 'singleton');
  invalidateLionsApiCache();
  return NextResponse.json({ ok: true });
}
