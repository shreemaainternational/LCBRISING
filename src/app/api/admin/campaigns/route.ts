import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { env } from '@/lib/env';
import { slugify } from '@/lib/ai/blog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(''));

const baseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().max(120).optional().or(z.literal('')),
  tagline: z.string().max(300).optional().or(z.literal('')),
  description: z.string().max(4000).optional().or(z.literal('')),
  category: z.string().max(60).optional().or(z.literal('')),
  goal_amount: z.number().nonnegative().max(1_000_000_000),
  hero_image: z.string().url().optional().or(z.literal('')),
  impact_metric: z.string().max(160).optional().or(z.literal('')),
  urgency: z.enum(['', 'normal', 'urgent', 'emergency']).default(''),
  starts_at: dateStr,
  ends_at: dateStr,
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  match_campaign: z.boolean().default(false),
});

const updateSchema = baseSchema.extend({ id: z.string().uuid() });

function normalisePayload(p: z.infer<typeof baseSchema>) {
  return {
    title: p.title.trim(),
    slug: (p.slug && slugify(p.slug)) || slugify(p.title),
    tagline: p.tagline || null,
    description: p.description || null,
    category: p.category || null,
    goal_amount: p.goal_amount,
    hero_image: p.hero_image || null,
    impact_metric: p.impact_metric || null,
    urgency: p.urgency || null,
    starts_at: p.starts_at || null,
    ends_at: p.ends_at || null,
    is_active: p.is_active,
    is_featured: p.is_featured,
    match_campaign: p.match_campaign,
  };
}

function friendlyError(message: string): string {
  if (/duplicate key/i.test(message)) {
    return 'Slug already used by another campaign — change the slug or leave it blank to regenerate.';
  }
  if (/row.level security/i.test(message)) {
    return 'Row-level security blocked the write. Make sure your account has admin/treasurer role.';
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

async function guard(): Promise<Response | null> {
  try {
    await requireAdmin();
    return null;
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'auth check failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = baseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const { data, error } = await writeWithFallback<{ id: string; slug: string }>((c) =>
    c.from('campaigns').insert(normalisePayload(parsed.data)).select('id, slug').single(),
  );
  if (error || !data) {
    return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown') }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, slug: data.slug }, { status: 201 });
}

export async function PUT(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const { id, ...rest } = parsed.data;
  const { data, error } = await writeWithFallback<{ id: string; slug: string }>((c) =>
    c.from('campaigns').update(normalisePayload(rest)).eq('id', id).select('id, slug').single(),
  );
  if (error || !data) {
    return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown') }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, slug: data.slug });
}
