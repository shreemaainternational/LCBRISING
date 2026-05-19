import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, requireSupabaseEnv } from '@/lib/env';

/**
 * Server-side Supabase client bound to the user's auth cookies.
 * Use inside Server Components, Route Handlers, and Server Actions.
 */
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(
    url,
    anonKey,
    {
      // Pin the schema explicitly so PostgREST doesn't fall back to a
      // project default that may not include "public". This prevents
      // the cryptic "Invalid schema: public" error from supabase-js.
      db: { schema: 'public' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component - safely ignored.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. NEVER import in client code.
 * Bypasses RLS — use only in trusted server-side flows
 * (webhooks, cron jobs, admin actions).
 */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client');
  }
  const { url } = requireSupabaseEnv();
  return createServiceClient(
    url,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
    },
  );
}

// ────────────────────── runtime key-health circuit breaker ──────────────────────
// If the service-role key returns "Invalid API key" / "Invalid JWT" the
// key is wrong for this project (a common Vercel env mismatch). Cache
// that fact for 5 minutes so the rest of the app stops attempting
// service-role writes (falls back to RLS via the user's session) and
// flips the integrations health to red until the env is fixed.

const KEY_BAD_TTL_MS = 5 * 60 * 1000;
let serviceRoleStatus:
  | { state: 'unknown' }
  | { state: 'bad'; reason: string; expiresAt: number }
  | { state: 'good'; expiresAt: number } = { state: 'unknown' };

export function markServiceRoleBad(reason: string): void {
  serviceRoleStatus = { state: 'bad', reason, expiresAt: Date.now() + KEY_BAD_TTL_MS };
}

export function markServiceRoleGood(): void {
  serviceRoleStatus = { state: 'good', expiresAt: Date.now() + KEY_BAD_TTL_MS };
}

export function clearServiceRoleStatus(): void {
  serviceRoleStatus = { state: 'unknown' };
}

export function getServiceRoleHealth(): { usable: boolean; reason?: string } {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return { usable: false, reason: 'SUPABASE_SERVICE_ROLE_KEY is not set' };
  if (serviceRoleStatus.state === 'bad' && serviceRoleStatus.expiresAt > Date.now()) {
    return { usable: false, reason: serviceRoleStatus.reason };
  }
  return { usable: true };
}

/**
 * RLS-resilient variant of createAdminClient. Returns the admin client
 * when the service-role key looks healthy, otherwise null — callers
 * can then fall back to the user's session (createClient()) or report
 * a graceful error instead of throwing.
 */
export function tryAdminClient(): SupabaseClient | null {
  const health = getServiceRoleHealth();
  if (!health.usable) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Wrap a service-role call and trip the breaker if it returns the
 * canonical "key doesn't belong to this project" error. The error is
 * re-thrown so callers' existing handlers still run.
 */
export async function withAdminBreaker<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();
    markServiceRoleGood();
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/invalid api key|invalid jwt|jwt expired/i.test(msg)) {
      markServiceRoleBad(msg);
    }
    throw e;
  }
}
