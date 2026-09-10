import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(32).optional(),
});

function friendlyError(message: string): string {
  if (/invalid api key/i.test(message)) {
    return 'Database auth failed. Set SUPABASE_SERVICE_ROLE_KEY, or apply migration 0073_constitutional_areas.sql / 0037_federation_rls.sql.';
  }
  if (/infinite recursion/i.test(message)) {
    return 'The members table RLS policy is recursing. Apply migration 0059_fix_members_rls_recursion.sql, or set SUPABASE_SERVICE_ROLE_KEY so admin writes bypass RLS.';
  }
  if (/row.level security|new row violates|permission denied/i.test(message)) {
    return 'Row-level security blocked the insert. Apply migration 0073_constitutional_areas.sql, sign in as an "admin" member, or set SUPABASE_SERVICE_ROLE_KEY.';
  }
  if (/relation .*constitutional_areas.* does not exist/i.test(message)) {
    return 'The constitutional_areas table is missing — apply migration 0073_constitutional_areas.sql.';
  }
  if (/duplicate key/i.test(message)) {
    return 'A constitutional area with that code already exists.';
  }
  return message;
}

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const supa = await createClient();
  const { data, error } = await supa.from('constitutional_areas').select('*').is('deleted_at', null).order('code');
  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  return NextResponse.json({ constitutional_areas: data ?? [] });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const cs = await cookies();
    const synthetic = cs.get('lcbr_crm')?.value === '1' || process.env.ADMIN_AUTH_BYPASS === '1';
    if (synthetic) {
      return NextResponse.json({
        error:
          'You are signed in via the diagnostic bypass — Supabase has no real session, so RLS will deny the insert. ' +
          'Set SUPABASE_SERVICE_ROLE_KEY, or sign in via /login as an "admin" member.',
      }, { status: 401 });
    }
  }

  const payload: Record<string, unknown> = { name: parsed.data.name, code: parsed.data.code };
  for (const k of Object.keys(payload)) if (payload[k] == null || payload[k] === '') delete payload[k];
  if (!payload.code) {
    const base = String(parsed.data.name).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'CA';
    payload.code = `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  // Prefer the service-role client when available (admin-gated write, bypasses
  // the recursive members RLS policy).
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.from('constitutional_areas').insert(payload).select().single();
      if (!error && data) return NextResponse.json({ constitutional_area: data }, { status: 201 });
      return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown_error') }, { status: 500 });
    } catch (e) {
      return NextResponse.json({ error: friendlyError(String(e)) }, { status: 500 });
    }
  }

  const supa = await createClient();
  const { data, error } = await supa.from('constitutional_areas').insert(payload).select().single();
  if (!error && data) return NextResponse.json({ constitutional_area: data }, { status: 201 });
  return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown_error') }, { status: 500 });
}
