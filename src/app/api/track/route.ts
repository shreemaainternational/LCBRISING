import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/track — increment the public visitor counter via an
 * atomic RPC. Safe no-op when Supabase isn't configured.
 *
 * Wired from src/components/site/PageViewBeacon.tsx, which fires
 * once on the public-site mount.
 */
export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, count: null }, { status: 200 });
  }
  try {
    const supa = createAdminClient();
    const { data, error } = await supa.rpc('increment_visits');
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'error' },
      { status: 500 },
    );
  }
}
