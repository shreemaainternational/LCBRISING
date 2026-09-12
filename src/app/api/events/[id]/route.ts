import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().nullable().optional(),
  date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().optional(),
  cover_url: z.string().url().nullable().optional(),
  category: z.string().max(60).nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const { data, error } = await createAdminClient().from('events').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ event: data });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  const clean = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  const { data, error } = await createAdminClient().from('events').update(clean).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const { error } = await createAdminClient().from('events').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
