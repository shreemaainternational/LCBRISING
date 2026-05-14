import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember, isAdminRole } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  url: z.string().url(),
  thumb_url: z.string().url().optional(),
  title: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  category: z.enum(['gallery', 'about', 'hero', 'press', 'event']).default('gallery'),
  alt: z.string().max(200).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  is_featured: z.boolean().default(false),
  display_order: z.number().int().default(0),
  taken_on: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const supa = await createClient();
  const category = req.nextUrl.searchParams.get('category');
  let q = supa
    .from('photos')
    .select('id, url, thumb_url, title, caption, category, alt, is_featured, display_order, taken_on, created_at')
    .is('deleted_at', null)
    .order('display_order')
    .order('created_at', { ascending: false });
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await getCurrentMember();
  if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const supa = createAdminClient();
  const { data, error } = await supa.from('photos').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'photo.upload',
    entity: 'photo',
    entity_id: data.id,
    payload: { url: parsed.data.url, category: parsed.data.category },
    actor_label: 'admin',
  });

  return NextResponse.json({ photo: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const actor = await getCurrentMember();
  if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const supa = createAdminClient();
  const { error } = await supa
    .from('photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'photo.delete',
    entity: 'photo',
    entity_id: id,
    actor_label: 'admin',
  });
  return NextResponse.json({ ok: true });
}
