import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/track — increment the public "TOTAL VISITORS" counter.
 *
 * Wired from src/components/site/PageViewBeacon.tsx, which fires once per
 * browser session on the public-site mount.
 *
 * Resilient by design so the counter never silently freezes again:
 *   1. Prefer the atomic `increment_visits()` RPC when it exists.
 *   2. If that RPC is absent (e.g. its migration hasn't reached this DB),
 *      fall back to a read-modify-write on the `site_counters` table —
 *      which only needs the table itself (migration 0051), no function.
 * Both paths use the service-role client (bypasses RLS). Any failure
 * degrades to a soft `{ ok: true, count: null }` so the beacon never errors.
 */
export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: true, count: null }, { status: 200 });
  }

  const supa = createAdminClient();

  // 1. Atomic RPC — used wherever increment_visits() has been applied.
  const rpc = await supa.rpc('increment_visits');
  if (!rpc.error) {
    return NextResponse.json({ ok: true, count: rpc.data ?? null });
  }

  // 2. Fallback: increment the table directly (no RPC dependency).
  try {
    const count = await incrementViaTable(supa);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    // Table genuinely missing or another hard error — don't fail the beacon.
    return NextResponse.json(
      { ok: true, count: null, degraded: err instanceof Error ? err.message : 'error' },
      { status: 200 },
    );
  }
}

/**
 * Read-modify-write increment of site_counters['visits']. Not strictly
 * atomic under heavy concurrency, which is fine for a public brochure site;
 * it exists so the counter works even without the increment_visits() RPC.
 */
async function incrementViaTable(supa: SupabaseClient): Promise<number> {
  const { data: row, error: readErr } = await supa
    .from('site_counters')
    .select('value')
    .eq('key', 'visits')
    .maybeSingle();
  if (readErr) throw readErr;

  const next = Number(row?.value ?? 0) + 1;
  const { data: saved, error: writeErr } = await supa
    .from('site_counters')
    .upsert(
      { key: 'visits', value: next, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    .select('value')
    .single();
  if (writeErr) throw writeErr;

  return Number(saved.value);
}
