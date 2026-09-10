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
  subtitle: z.string().max(300).optional().or(z.literal('')),
  beneficiary_name: z.string().max(120).optional().or(z.literal('')),
  beneficiary_age: z.number().int().positive().max(120).optional().nullable(),
  location: z.string().max(160).optional().or(z.literal('')),
  hero_image: z.string().url().optional().or(z.literal('')),
  before_image: z.string().url().optional().or(z.literal('')),
  after_image: z.string().url().optional().or(z.literal('')),
  body: z.string().optional().or(z.literal('')),
  impact_quote: z.string().max(500).optional().or(z.literal('')),
  impact_metric: z.string().max(160).optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.extend({ id: z.string().uuid() });

function normalisePayload(p: z.infer<typeof baseSchema>) {
  const slug = (p.slug && p.slug.trim()) || slugify(p.title);
  const out: Record<string, unknown> = {
    title: p.title.trim(),
    slug,
    subtitle: p.subtitle || null,
    beneficiary_name: p.beneficiary_name || null,
    beneficiary_age: p.beneficiary_age ?? null,
    location: p.location || null,
    hero_image: p.hero_image || null,
    before_image: p.before_image || null,
    after_image: p.after_image || null,
    body: p.body || null,
    impact_quote: p.impact_quote || null,
    impact_metric: p.impact_metric || null,
    tags: p.tags,
    is_published: p.is_published,
    is_featured: p.is_featured,
  };
  if (p.is_published) {
    out.published_at = new Date().toISOString();
  }
  return out;
}

function friendlyError(message: string): string {
  if (/duplicate key/i.test(message)) {
    return 'Slug already used by another story — change the slug or leave it blank to regenerate.';
  }
  if (/row.level security/i.test(message)) {
    return 'Row-level security blocked the write. Make sure your account has admin/officer role.';
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
    c.from('stories').insert(payload).select('id, slug').single(),
  );
  if (error || !data) {
    return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown') }, { status: 500 });
  }
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
  const { id, ...rest } = parsed.data;
  const payload = normalisePayload(rest);

  const { data, error } = await writeWithFallback<{ id: string; slug: string }>((c) =>
    c.from('stories').update(payload).eq('id', id).select('id, slug').single(),
  );
  if (error || !data) {
    return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown') }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, slug: data.slug });
}

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
    c.from('stories').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').single(),
  );
  if (error) {
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
