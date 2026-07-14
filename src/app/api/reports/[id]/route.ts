import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const { data, error } = await createAdminClient().from('reports').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ report: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const { id } = await ctx.params;
  const db = createAdminClient();
  const { data: row } = await db.from('reports').select('storage_path').eq('id', id).single();
  if (row?.storage_path) {
    try { await db.storage.from('reports').remove([row.storage_path]); } catch { /* ignore */ }
  }
  await db.from('reports').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
