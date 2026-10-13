import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthorizedWriteClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const eventUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().optional(),
  cover_url: z.string().url().nullable().optional(),
});

/** PATCH /api/events/[id] — edit an event. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const parsed = eventUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const payload: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(parsed.data)) {
    if (val !== undefined) payload[k] = val === '' ? null : val;
  }
  if (Object.keys(payload).length === 0) return NextResponse.json({ ok: true });

  const { id } = await params;
  const db = await createAuthorizedWriteClient();
  const { data, error } = await db.from('events').update(payload).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'event.update', entity: 'event', entity_id: id,
    actor_member_id: actor?.id ?? null, diff: { after: payload },
  });

  return NextResponse.json({ event: data });
}

/** DELETE /api/events/[id] — remove an event. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const { id } = await params;
  const db = await createAuthorizedWriteClient();
  const { error } = await db.from('events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });

  await writeAudit({
    action: 'event.delete', entity: 'event', entity_id: id,
    actor_member_id: actor?.id ?? null,
  });

  return NextResponse.json({ ok: true });
}
