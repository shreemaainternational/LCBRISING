import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function friendlyError(message: string): string {
  if (/invalid api key/i.test(message)) {
    return 'Database auth failed. Set SUPABASE_SERVICE_ROLE_KEY or check that the anon key matches the project URL.';
  }
  if (/row.level security/i.test(message)) {
    return 'Row-level security blocked the insert. Make sure your account is linked to an admin/officer member row.';
  }
  if (/duplicate key/i.test(message)) {
    return 'Receipt number already exists — leave it blank to auto-generate.';
  }
  return message;
}

/** GET — list recent donations. */
export async function GET(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
  const supa = await createClient();
  const { data, error } = await supa
    .from('donations').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: friendlyError(error.message) }, { status: 500 });
  return NextResponse.json({ donations: data ?? [] });
}

const schema = z.object({
  donor_name: z.string().min(1).max(200),
  donor_email: z.string().email().optional().or(z.literal('')),
  donor_phone: z.string().max(20).optional(),
  donor_pan: z.string().max(20).optional(),
  amount: z.number().min(1),
  currency: z.string().default('INR'),
  campaign: z.string().max(120).optional(),
  message: z.string().max(1000).optional(),
  is_anonymous: z.boolean().default(false),
  receipt_no: z.string().max(50).optional(),
});

/** POST — manually record an offline donation (cheque, cash, bank transfer). */
export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const payload = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== ''),
  );
  if (!payload.receipt_no) payload.receipt_no = `DON-${Date.now()}`;

  // 1) Try the user's SSR session first.
  const supa = await createClient();
  const first = await supa.from('donations').insert(payload).select().single();
  if (!first.error && first.data) return NextResponse.json({ donation: first.data }, { status: 201 });

  const msg = first.error?.message ?? '';
  const isAuthFail = /invalid api key|jwt/i.test(msg) || /row.level security/i.test(msg);

  // 2) Fall back to admin client if available.
  if (isAuthFail && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const second = await admin.from('donations').insert(payload).select().single();
      if (!second.error && second.data) return NextResponse.json({ donation: second.data }, { status: 201 });
      return NextResponse.json({ error: friendlyError(second.error?.message ?? 'unknown_error') }, { status: 500 });
    } catch (e) {
      return NextResponse.json({ error: friendlyError(String(e)) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: friendlyError(msg || 'unknown_error') }, { status: 500 });
}
