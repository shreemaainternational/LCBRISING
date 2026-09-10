import { NextResponse } from 'next/server';
import { memberSchema } from '@/lib/validation/schemas';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { describeSupabaseError } from '@/lib/supabase/errors';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';

export const runtime = 'nodejs';

export async function GET() {
  const actor = await requirePermission('member.read');
  if (isGuardFailure(actor)) return actor;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
  return NextResponse.json({ members: data });
}

export async function POST(req: Request) {
  const actor = await requirePermission('member.create');
  if (isGuardFailure(actor)) return actor;

  const body = await req.json().catch(() => null);
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  // Trusted admin write (gated by requirePermission). Use the service-role
  // client so the write + read-back bypass RLS and avoid "infinite recursion
  // detected in policy for relation members" (see /api/crm/members).
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data, error } = await db.from('members').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: describeSupabaseError(error.message) }, { status: 500 });
  return NextResponse.json({ member: data }, { status: 201 });
}
