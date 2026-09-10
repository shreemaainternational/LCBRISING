import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
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
 * Client for a trusted admin write that has ALREADY passed an authorization
 * guard (requireAdmin / requirePermission). Returns the service-role client
 * when SUPABASE_SERVICE_ROLE_KEY is configured so the INSERT/UPDATE and its
 * `.select()` read-back bypass RLS.
 *
 * Why this matters: several table policies sub-select public.members
 * (events, dues, zones/districts admin-write, the members self-read policy
 * itself). The original members policies are self-referential, so any query
 * that reaches them through RLS trips "infinite recursion detected in policy
 * for relation members" on databases where migration 0059 has not been
 * applied. Bypassing RLS for these already-authorized writes avoids the
 * error regardless of DB state. Falls back to the user's session when no
 * service-role key is set (relies on migrations 0037 + 0059 being applied).
 */
export async function createAuthorizedWriteClient() {
  if (env.SUPABASE_SERVICE_ROLE_KEY) return createAdminClient();
  return createClient();
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
