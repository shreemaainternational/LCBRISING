import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateOpenAiCache, loadOpenAiConfig } from '@/lib/ai/openai-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  api_key: z.string().min(20).max(200).optional(),
  model: z.string().min(2).max(80).optional(),
  base_url: z.string().url().optional(),
  is_active: z.boolean().optional(),
  monthly_cost_cap_usd: z.number().min(0).max(10000).optional(),
  test: z.boolean().default(false),
  clear_key: z.boolean().default(false),
});

function maskKey(s: string): string {
  return s.length > 12 ? `${s.slice(0, 7)}…${s.slice(-4)}` : '••••••';
}

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const db = createAdminClient();
  const { data } = await db.from('openai_settings')
    .select('id, api_key, model, base_url, is_active, monthly_cost_cap_usd, last_test_ok, last_test_at, last_test_error, configured_at, updated_at')
    .eq('id', 'singleton').maybeSingle();
  if (!data) return NextResponse.json({ settings: null });
  const key = data.api_key as string | null;
  return NextResponse.json({
    settings: {
      ...data,
      api_key: null,
      api_key_masked: key ? maskKey(key) : null,
      has_key: !!key,
    },
  });
}

export async function PUT(req: Request) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const body = await req.json().catch(() => ({}));
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const db = createAdminClient();
  const patch: Record<string, unknown> = {
    id: 'singleton',
    configured_by: actor?.id ?? null,
    configured_at: new Date().toISOString(),
  };
  if (parsed.data.clear_key) patch.api_key = null;
  else if (parsed.data.api_key) patch.api_key = parsed.data.api_key.trim();
  if (parsed.data.model) patch.model = parsed.data.model;
  if (parsed.data.base_url) patch.base_url = parsed.data.base_url;
  if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;
  if (parsed.data.monthly_cost_cap_usd !== undefined) patch.monthly_cost_cap_usd = parsed.data.monthly_cost_cap_usd;

  // Optional connectivity probe BEFORE we save the new key.
  let testOk: boolean | null = null;
  let testError: string | null = null;
  if (parsed.data.test && parsed.data.api_key) {
    try {
      const probe = await fetch(`${(parsed.data.base_url ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/models`, {
        headers: { authorization: `Bearer ${parsed.data.api_key.trim()}` },
        cache: 'no-store',
      });
      testOk = probe.ok;
      if (!probe.ok) testError = `HTTP ${probe.status}: ${(await probe.text().catch(() => '')).slice(0, 200)}`;
    } catch (e) {
      testOk = false;
      testError = (e as Error).message;
    }
    patch.last_test_ok = testOk;
    patch.last_test_at = new Date().toISOString();
    patch.last_test_error = testError;
  }

  const { data, error } = await db.from('openai_settings')
    .upsert(patch, { onConflict: 'id' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateOpenAiCache();
  await loadOpenAiConfig(true);

  const key = data.api_key as string | null;
  return NextResponse.json({
    ok: true,
    settings: { ...data, api_key: null, api_key_masked: key ? maskKey(key) : null, has_key: !!key },
    test: { ok: testOk, error: testError },
  });
}

export async function DELETE() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  await createAdminClient().from('openai_settings').update({
    api_key: null, is_active: false,
  }).eq('id', 'singleton');
  invalidateOpenAiCache();
  return NextResponse.json({ ok: true });
}
