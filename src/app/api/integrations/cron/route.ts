import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateCronCache, loadCronSecret } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function randomSecret(): string {
  // 48 hex chars / 192 bits. Plenty for HMAC-grade auth.
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const upsertSchema = z.object({
  rotate: z.boolean().default(false),
  secret: z.string().min(16).max(200).optional(),
});

export async function GET() {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; }
  void actor;

  const db = createAdminClient();
  const { data } = await db.from('cron_settings').select('id, secret, last_rotated_at, created_at, updated_at').eq('id', 'singleton').maybeSingle();
  if (!data) return NextResponse.json({ settings: null });
  // Never leak the actual secret to anyone other than an admin — and even then mask half of it.
  const s = data.secret as string;
  const masked = s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-6)}` : '••••••••';
  return NextResponse.json({
    settings: {
      ...data,
      secret_masked: masked,
      secret_length: s.length,
    },
  });
}

/**
 * PUT — rotate or set a specific secret. POST body:
 *   { rotate: true }            generate a fresh random secret
 *   { secret: "..." }           accept an admin-supplied value
 */
export async function PUT(req: Request) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; }

  const body = await req.json().catch(() => ({}));
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const newSecret = parsed.data.rotate ? randomSecret() : (parsed.data.secret ?? randomSecret());

  const db = createAdminClient();
  const { data, error } = await db.from('cron_settings').upsert({
    id: 'singleton',
    secret: newSecret,
    last_rotated_at: new Date().toISOString(),
    last_rotated_by: actor?.id ?? null,
  }, { onConflict: 'id' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateCronCache();
  await loadCronSecret(true);

  return NextResponse.json({
    ok: true,
    secret: newSecret,
    settings: {
      ...data,
      secret_masked: `${newSecret.slice(0, 6)}…${newSecret.slice(-6)}`,
    },
  });
}

/**
 * POST /api/integrations/cron/reveal — return the full secret to the
 * current admin once, then re-mask. Used by the "Copy" button.
 */
export async function POST() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { data } = await createAdminClient().from('cron_settings').select('secret').eq('id', 'singleton').maybeSingle();
  return NextResponse.json({ secret: data?.secret ?? null });
}
