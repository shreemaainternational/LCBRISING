import { NextResponse } from 'next/server';
import { z } from 'zod';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { invalidateVapidCache, loadVapidConfig } from '@/lib/push-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  rotate: z.boolean().default(false),
  subject: z.string().min(5).max(200).optional(),
});

function maskKey(s: string): string {
  return s.length > 12 ? `${s.slice(0, 8)}…${s.slice(-8)}` : '••••••••';
}

/** GET — return current keypair status (masked private key). */
export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  await loadVapidConfig(true); // lazy-generate if missing

  const db = createAdminClient();
  const { data } = await db.from('push_settings')
    .select('id, public_key, private_key, subject, last_rotated_at, created_at, updated_at')
    .eq('id', 'singleton').maybeSingle();

  if (!data) return NextResponse.json({ settings: null });
  const pub = data.public_key as string | null;
  const priv = data.private_key as string | null;
  return NextResponse.json({
    settings: {
      id: data.id,
      public_key: pub,
      public_key_masked: pub ? maskKey(pub) : null,
      private_key_masked: priv ? maskKey(priv) : null,
      subject: data.subject,
      last_rotated_at: data.last_rotated_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  });
}

/** PUT — rotate the keypair or update the subject. */
export async function PUT(req: Request) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const body = await req.json().catch(() => ({}));
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const db = createAdminClient();
  const patch: Record<string, unknown> = { id: 'singleton', last_rotated_by: actor?.id ?? null };

  if (parsed.data.rotate) {
    const fresh = webpush.generateVAPIDKeys();
    patch.public_key = fresh.publicKey;
    patch.private_key = fresh.privateKey;
    patch.last_rotated_at = new Date().toISOString();
  }
  if (parsed.data.subject) patch.subject = parsed.data.subject;

  const { data, error } = await db.from('push_settings')
    .upsert(patch, { onConflict: 'id' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateVapidCache();
  await loadVapidConfig(true);

  return NextResponse.json({
    ok: true,
    settings: {
      id: data.id,
      public_key: data.public_key,
      private_key: parsed.data.rotate ? data.private_key : maskKey((data.private_key as string) ?? ''),
      subject: data.subject,
      last_rotated_at: data.last_rotated_at,
    },
  });
}

/** POST /reveal — return the full private key once. */
export async function POST() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  await loadVapidConfig(true);
  const { data } = await createAdminClient().from('push_settings')
    .select('public_key, private_key, subject').eq('id', 'singleton').maybeSingle();
  return NextResponse.json({
    public_key: data?.public_key ?? null,
    private_key: data?.private_key ?? null,
    subject: data?.subject ?? null,
  });
}
