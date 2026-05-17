import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireZoneChair } from '@/lib/zone-portal';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  zone_id: z.string().uuid(),
  require_activity_approval: z.boolean(),
});

export async function PUT(req: Request) {
  const ctx = await requireZoneChair();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  if (parsed.data.zone_id !== ctx.zone.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const db = createAdminClient();
  const { error } = await db.from('zones')
    .update({ require_activity_approval: parsed.data.require_activity_approval })
    .eq('id', ctx.zone.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
