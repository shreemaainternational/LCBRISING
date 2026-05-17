import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/session/sync
 *
 * No-op endpoint that touches the SSR Supabase client so the cookies
 * set client-side by signInWithPassword() are persisted into the
 * Next.js cookie jar via @supabase/ssr's getAll/setAll handlers.
 *
 * Posted from ZoneLoginForm, DistrictLoginForm, etc. The actual
 * auth state lives in the Supabase auth cookies — this route just
 * forces the server to round-trip them through its handlers so the
 * next server-rendered request sees the new session.
 */
export async function POST() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  return NextResponse.json({ ok: true, userId: user?.id ?? null });
}
