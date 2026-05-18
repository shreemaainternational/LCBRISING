import { NextResponse } from 'next/server';
import { memberSchema } from '@/lib/validation/schemas';
import { createClient } from '@/lib/supabase/server';
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  const supabase = await createClient();
  const { data, error } = await supabase.from('members').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data }, { status: 201 });
}
