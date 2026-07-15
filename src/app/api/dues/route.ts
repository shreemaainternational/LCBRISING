import { NextResponse } from 'next/server';
import { duesSchema } from '@/lib/validation/schemas';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dues').select('*, members(name, email)').order('due_date');
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
  return NextResponse.json({ dues: data });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const body = await req.json().catch(() => null);
  const parsed = duesSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  // Trusted admin write (already gated by requireAdmin). Use the service-role
  // client so the INSERT and its read-back bypass RLS: the dues SELECT policy
  // sub-selects public.members, which trips "infinite recursion detected in
  // policy for relation members" on a database where migration 0059 has not
  // been applied.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data, error } = await db.from('dues').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
  return NextResponse.json({ dues: data }, { status: 201 });
}
