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
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
