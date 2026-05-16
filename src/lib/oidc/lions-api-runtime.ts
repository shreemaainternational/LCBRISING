/**
 * Runtime-overridable Lions REST API credentials. Mirrors the OIDC
 * runtime cache. Lets admins paste credentials at /admin/integrations/oidc
 * without redeploying.
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface LionsApiSettings {
  base_url: string | null;
  api_key: string | null;
  access_token: string | null;
  district_code: string | null;
  multi_district_code: string | null;
  is_active: boolean;
  sandbox_mode?: boolean;
}

const TTL_MS = 60_000;
let cache: { value: LionsApiSettings | null; expiresAt: number } | null = null;

export async function loadLionsApiSettings(force = false): Promise<LionsApiSettings | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.value;
  try {
    const db = createAdminClient();
    const { data } = await db.from('lions_api_settings').select('*').eq('id', 'singleton').maybeSingle();
    const value = (data && data.is_active ? data : null) as LionsApiSettings | null;
    cache = { value, expiresAt: now + TTL_MS };
    return value;
  } catch {
    cache = { value: null, expiresAt: now + TTL_MS };
    return null;
  }
}

export function peekLionsApiSettings(): LionsApiSettings | null {
  return cache?.value ?? null;
}

export function invalidateLionsApiCache(): void {
  cache = null;
}
