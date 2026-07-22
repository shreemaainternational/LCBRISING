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
  country: z.string().max(120).optional(),
  council_chairperson_name: z.string().max(200).optional(),
});

function friendlyError(message: string): string {
  if (/invalid api key/i.test(message)) {
    return 'Database auth failed. Set SUPABASE_SERVICE_ROLE_KEY, or apply migration 0037_federation_rls.sql so admin members can write via their own session.';
  }
  if (/infinite recursion/i.test(message)) {
    return 'The members table RLS policy is recursing. Apply migration 0059_fix_members_rls_recursion.sql, or set SUPABASE_SERVICE_ROLE_KEY so admin writes bypass RLS.';
  }
  if (/row.level security|new row violates|permission denied/i.test(message)) {
    return 'Row-level security blocked the insert. Apply migration 0037_federation_rls.sql, sign in as an "admin" member, or set SUPABASE_SERVICE_ROLE_KEY.';
  }
  if (/duplicate key/i.test(message)) {
    return 'A multiple district with that code already exists.';
  }
  return message;
}

export async function GET() {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const supa = await createClient();
  const { data, error } = await supa.from('multiple_districts').select('*').is('deleted_at', null).order('code');
  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  return NextResponse.json({ multiple_districts: data ?? [] });
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
          'You are signed in via the diagnostic bypass (lcbr_crm cookie or ADMIN_AUTH_BYPASS=1) — ' +
          'Supabase has no real session, so RLS will deny the insert. Set SUPABASE_SERVICE_ROLE_KEY, ' +
          'or sign in via /login as an "admin" member.',
      }, { status: 401 });
    }
  }

  const payload: Record<string, unknown> = {
    name: parsed.data.name,
    code: parsed.data.code,
    country: parsed.data.country,
    council_chairperson_name: parsed.data.council_chairperson_name,
  };
  for (const k of Object.keys(payload)) if (payload[k] == null || payload[k] === '') delete payload[k];

  // multiple_districts.code is NOT NULL + unique — auto-derive when omitted.
  if (!payload.code) {
    const base = String(parsed.data.name).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'MD';
    payload.code = `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  // Prefer the service-role client when available (admin-gated write, bypasses
  // the recursive members RLS policy).
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.from('multiple_districts').insert(payload).select().single();
      if (!error && data) return NextResponse.json({ multiple_district: data }, { status: 201 });
      return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown_error') }, { status: 500 });
    } catch (e) {
      return NextResponse.json({ error: friendlyError(String(e)) }, { status: 500 });
    }
  }

  const supa = await createClient();
  const { data, error } = await supa.from('multiple_districts').insert(payload).select().single();
  if (!error && data) return NextResponse.json({ multiple_district: data }, { status: 201 });
  return NextResponse.json({ error: friendlyError(error?.message ?? 'unknown_error') }, { status: 500 });
}
