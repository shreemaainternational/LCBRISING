import { NextResponse } from 'next/server';
import { activitySchema } from '@/lib/validation/schemas';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { enqueueJob } from '@/lib/automation/engine';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activities').select('*').order('date', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: data });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => null);
  const parsed = activitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from('activities').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await enqueueJob('on_activity_created', { activity_id: data.id });
  return NextResponse.json({ activity: data }, { status: 201 });
}
