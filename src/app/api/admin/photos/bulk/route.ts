import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMember, isAdminRole } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX = 200;

const Item = z.object({
  url: z.string().url(),
  thumb_url: z.string().url().optional(),
  title: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  alt: z.string().max(200).optional(),
  taken_on: z.string().optional(),
});

const Body = z.object({
  category: z.enum(['gallery', 'about', 'hero', 'press', 'event']).default('gallery'),
  is_featured: z.boolean().default(false),
  photos: z.array(Item).min(1).max(MAX),
});

/**
 * Bulk-insert gallery photos. Accepts many already-uploaded storage URLs at
 * once (the client uploads the files straight to Supabase Storage, then posts
 * the resulting public URLs here). Skips URLs already present so re-submitting
 * is idempotent. Rows land in the shared `photos` table read by the public
 * website gallery and the mobile app.
 */
export async function POST(req: NextRequest) {
  const actor = await getCurrentMember();
  if (!actor) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  const { category, is_featured, photos } = parsed.data;
  const supa = createAdminClient();

  // De-dupe within the request and against existing rows (by URL).
  const seen = new Set<string>();
  const unique = photos.filter((p) => (seen.has(p.url) ? false : (seen.add(p.url), true)));

  const urls = unique.map((p) => p.url);
  const { data: existing } = await supa
    .from('photos')
    .select('url')
    .in('url', urls)
    .is('deleted_at', null);
  const existingUrls = new Set((existing ?? []).map((e) => String(e.url)));

  // Preserve upload order via display_order; new photos sort after existing.
  const { data: maxRow } = await supa
    .from('photos')
    .select('display_order')
    .eq('category', category)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  let order = (maxRow?.display_order ?? 0) as number;

  const rows = unique
    .filter((p) => !existingUrls.has(p.url))
    .map((p) => ({
      url: p.url,
      thumb_url: p.thumb_url ?? null,
      title: p.title ?? null,
      caption: p.caption ?? null,
      alt: p.alt ?? p.title ?? null,
      taken_on: p.taken_on ?? null,
      category,
      is_featured,
      display_order: ++order,
      uploaded_by: actor.id ?? null,
    }));

  const skipped = unique.length - rows.length;
  let inserted = 0;
  if (rows.length) {
    const { data, error } = await supa.from('photos').insert(rows).select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted = data?.length ?? 0;
  }

  await writeAudit({
    action: 'photo.bulk_upload',
    entity: 'photo',
    actor_member_id: actor.id ?? null,
    actor_label: 'admin',
    payload: { category, inserted, skipped },
  });

  return NextResponse.json({ inserted, skipped, total: photos.length }, { status: 201 });
}
