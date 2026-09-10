import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateLionsPortalCache, loadLionsPortalSettings } from '@/lib/oidc/lions-portal-runtime';
import { encrypt, decrypt } from '@/lib/crypto/secret-box';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const REDACTED = '__REDACTED__';

const upsertSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  login_url: z.string().url().optional().or(z.literal('')),
  data_url: z.string().url().optional().or(z.literal('')),
  district_code: z.string().max(32).optional(),
  is_active: z.boolean().default(true),
  sandbox_mode: z.boolean().default(false),
  test: z.boolean().default(true),
}).refine((v) => v.sandbox_mode || (!!v.login_url && !!v.data_url), {
  message: 'Login URL and Data URL are required unless sandbox mode is enabled.',
});

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { data } = await createAdminClient()
    .from('lions_portal_credentials').select('*').eq('id', 'singleton').maybeSingle();
  if (!data) return NextResponse.json({ settings: null });
  return NextResponse.json({
    settings: {
      ...data,
      username: data.username ? REDACTED : null,
      password: data.password ? REDACTED : null,
      session_token: undefined,
    },
  });
}

export async function PUT(req: Request) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();

  // Preserve saved secrets when the form sends REDACTED / undefined.
  let username = parsed.data.username;
  let password = parsed.data.password;
  if (username === REDACTED || username === undefined || password === REDACTED || password === undefined) {
    const { data: existing } = await db.from('lions_portal_credentials')
      .select('username, password').eq('id', 'singleton').maybeSingle();
    if (username === REDACTED || username === undefined) username = decrypt(existing?.username as string | null) ?? undefined;
    if (password === REDACTED || password === undefined) password = decrypt(existing?.password as string | null) ?? undefined;
  }

  // Optional live login test against the token endpoint.
  let loginOk: boolean | null = null;
  let loginError: string | null = null;
  if (parsed.data.test && !parsed.data.sandbox_mode && parsed.data.login_url && username && password) {
    try {
      const res = await fetch(parsed.data.login_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password }),
        cache: 'no-store',
      });
      loginOk = res.ok;
      if (!res.ok) loginError = `HTTP ${res.status}`;
    } catch (e) { loginOk = false; loginError = String(e); }
  }

  const payload = {
    id: 'singleton' as const,
    username: encrypt(username ?? null),
    password: encrypt(password ?? null),
    login_url: parsed.data.login_url || null,
    data_url: parsed.data.data_url || null,
    district_code: parsed.data.district_code || null,
    is_active: parsed.data.is_active,
    sandbox_mode: parsed.data.sandbox_mode,
    // Force a fresh login next sync when credentials/endpoints change.
    session_token: null,
    session_expires_at: null,
    configured_by: actor?.id ?? null,
    configured_at: new Date().toISOString(),
    last_login_ok: loginOk,
    last_login_at: parsed.data.test ? new Date().toISOString() : null,
    last_login_error: loginError,
  };

  const { data, error } = await db.from('lions_portal_credentials')
    .upsert(payload, { onConflict: 'id' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateLionsPortalCache();
  await loadLionsPortalSettings(true);

  return NextResponse.json({
    ok: true,
    settings: {
      ...data,
      username: data.username ? REDACTED : null,
      password: data.password ? REDACTED : null,
      session_token: undefined,
    },
    test: { ok: loginOk, error: loginError },
  });
}

export async function DELETE() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  await createAdminClient().from('lions_portal_credentials')
    .update({ is_active: false, session_token: null, session_expires_at: null }).eq('id', 'singleton');
  invalidateLionsPortalCache();
  return NextResponse.json({ ok: true });
}
