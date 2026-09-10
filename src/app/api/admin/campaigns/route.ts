import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { env } from '@/lib/env';
import { slugify } from '@/lib/ai/blog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const baseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().max(120).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  tagline: z.string().max(300).optional().or(z.literal('')),
  goal_amount: z.number().positive(),
  currency: z.string().max(8).optional().or(z.literal('')),
  starts_at: z.string().optional().or(z.literal('')),
  ends_at: z.string().optional().or(z.literal('')),
  hero_image: z.string().url().optional().or(z.literal('')),
  urgency: z.string().max(40).optional().or(z.literal('')),
  impact_metric: z.string().max(160).optional().or(z.literal('')),
  category: z.string().max(80).optional().or(z.literal('')),
  match_campaign: z.boolean().default(false),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  activity_ids: z.array(z.string().uuid()).default([]),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.extend({ id: z.string().uuid() });

function normalisePayload(p: z.infer<typeof baseSchema>) {
  const slug = (p.slug && p.slug.trim()) || slugify(p.title);
  const out: Record<string, unknown> = {
    title: p.title.trim(),
    slug,
    description: p.description || null,
    tagline: p.tagline || null,
    goal_amount: p.goal_amount,
    currency: p.currency || 'INR',
    starts_at: p.starts_at || null,
    ends_at: p.ends_at || null,
    hero_image: p.hero_image || null,
    urgency: p.urgency || null,
    impact_metric: p.impact_metric || null,
    category: p.category || null,
    match_campaign: p.match_campaign,
    is_active: p.is_active,
    is_featured: p.is_featured,
  };
  return out;
}

function friendlyError(message: string): string {
  if (/duplicate key/i.test(message)) {
    return 'Slug already used by another campaign — change the slug or leave it blank to regenerate.';
  }
  if (/row.level security/i.test(message)) {
    return 'Row-level security blocked the write. Make sure your account has admin/officer/treasurer role.';
  }
  return message;
}

type SupaClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

type OpResult<T> = { data: T | null; error: { message: string } | null };

async function writeWithFallback<T>(
  op: (client: SupaClient) => PromiseLike<OpResult<T>>,
): Promise<OpResult<T>> {
  const supa = await createClient();
  const first = await op(supa);
  if (!first.error) return { data: first.data, error: null };
  const msg = first.error.message ?? '';
  const isAuthFail = /invalid api key|jwt/i.test(msg) || /row.level security/i.test(msg);
  if (isAuthFail && env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const second = await op(admin);
    if (!second.error) return { data: second.data, error: null };
    return { data: null, error: { message: second.error.message } };
  }
  return { data: null, error: { message: msg } };
}

/** Replace the campaign_activities rows for a campaign with the given set. */
async function syncActivities(campaignId: string, activityIds: string[]) {
  const client: SupaClient = env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();
  await client.from('campaign_activities').delete().eq('campaign_id', campaignId);
  if (activityIds.length > 0) {
    await client
      .from('campaign_activities')
      .insert(activityIds.map((activity_id) => ({ campaign_id: campaignId, activity_id })));
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const payload = normalisePayload(parsed.data);

  const { data, error } = await writeWithFallback<{ id: string; slug: string }>((c) =>
    c.from('campaigns').insert(payload).select('id, slug').single(),
  );
  if (error || !data) {
    return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown') }, { status: 500 });
  }
  await syncActivities(data.id, parsed.data.activity_ids);
  return NextResponse.json({ id: data.id, slug: data.slug }, { status: 201 });
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
  }
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const { id, activity_ids, ...rest } = parsed.data;
  const payload = normalisePayload({ ...rest, activity_ids });

  const { data, error } = await writeWithFallback<{ id: string; slug: string }>((c) =>
    c.from('campaigns').update(payload).eq('id', id).select('id, slug').single(),
  );
  if (error || !data) {
    return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown') }, { status: 500 });
  }
  await syncActivities(id, activity_ids);
  return NextResponse.json({ id: data.id, slug: data.slug });
}

/** Archive (unpublish) a campaign — campaigns have no hard-delete/deleted_at column by design. */
export async function DELETE(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
  }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await writeWithFallback<{ id: string }>((c) =>
    c.from('campaigns').update({ is_active: false }).eq('id', id).select('id').single(),
  );
  if (error) {
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
