import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({
  status: z.enum(['pending', 'paid', 'cancelled']),
  paid_utr: z.string().max(40).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'unauthorised' }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('commission_records')
    .update({
      ...parsed.data,
      paid_at: parsed.data.status === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
