/**
 * POST /api/integrations/health/supabase/probe
 *
 * Probe a candidate URL + key triple WITHOUT writing it into env.
 * Used by the setup wizard: paste keys, click "Test", see live
 * per-client result and a copy-paste-ready Vercel CLI command set.
 *
 * RBAC: integration.manage. The keys never persist; the request body
 * is read once and forwarded straight to Supabase.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { probeSupabaseTriple } from '@/lib/supabase/probe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const schema = z.object({
  url: z.string().min(1).max(500),
  anonKey: z.string().min(20).max(4000),
  serviceRoleKey: z.string().min(20).max(4000).optional().or(z.literal('')),
});

export async function POST(req: Request) {
  const actor = await requirePermission('integration.manage');
  if (isGuardFailure(actor)) return actor;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }

  const probe = await probeSupabaseTriple({
    url: parsed.data.url.trim().replace(/\/+$/, ''),
    anonKey: parsed.data.anonKey.trim(),
    serviceRoleKey: parsed.data.serviceRoleKey?.trim() || undefined,
  });
  return NextResponse.json(probe);
}
