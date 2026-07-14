import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import {
  disconnectCanva,
  loadCanvaRuntime,
  saveCanvaOAuthApp,
} from '@/lib/canva/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  client_id: z.string().min(3).max(200).optional(),
  client_secret: z.string().min(3).max(400).optional(),
  clear_secret: z.boolean().default(false),
});

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const runtime = await loadCanvaRuntime(true);
  return NextResponse.json({ runtime });
}

/** Save the OAuth app credentials (client id / secret). */
export async function PUT(req: Request) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const body = await req.json().catch(() => ({}));
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    await saveCanvaOAuthApp({
      clientId: parsed.data.client_id,
      clientSecret: parsed.data.clear_secret ? null : parsed.data.client_secret,
      connectedBy: actor?.id ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'save_failed' },
      { status: 500 },
    );
  }

  await writeAudit({
    action: 'canva.configure',
    entity: 'canva_settings',
    payload: { id: 'singleton', by: actor?.id ?? null, set_secret: !!parsed.data.client_secret },
    actor_label: 'admin',
  }).catch(() => {});

  const runtime = await loadCanvaRuntime(true);
  return NextResponse.json({ ok: true, runtime });
}

/** Disconnect — drop the stored tokens (keeps app credentials). */
export async function DELETE() {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  await disconnectCanva();
  await writeAudit({
    action: 'canva.disconnect',
    entity: 'canva_settings',
    payload: { id: 'singleton', by: actor?.id ?? null },
    actor_label: 'admin',
  }).catch(() => {});

  const runtime = await loadCanvaRuntime(true);
  return NextResponse.json({ ok: true, runtime });
}
