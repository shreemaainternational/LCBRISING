import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — list recent donations. */
export async function GET(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
  const { data, error } = await createAdminClient()
    .from('donations').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  const payload = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== ''),
  );
  if (!payload.receipt_no) {
    payload.receipt_no = `DON-${Date.now()}`;
  }

  const { data, error } = await createAdminClient()
    .from('donations').insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ donation: data }, { status: 201 });
}
