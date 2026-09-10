import { NextResponse } from 'next/server';
import { eventSchema } from '@/lib/validation/schemas';
import { createClient, createAuthorizedWriteClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('events').select('*').order('date');
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
  return NextResponse.json({ events: data });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const body = await req.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  // Trusted admin write (already gated by requireAdmin). Use the service-role
  // client so the INSERT and its read-back bypass RLS. The events SELECT policy
  // sub-selects public.members, so on a database where migration 0059 has not
  // been applied the read-back trips "infinite recursion detected in policy for
  // relation members". Bypassing RLS here avoids that regardless of DB state.
  const db = await createAuthorizedWriteClient();
  const { data, error } = await db.from('events').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}
