/**
 * Runtime-overridable Lions Portal (District Governor login) credentials.
 * Mirrors lions-api-runtime.ts. Lets an admin paste a DG's Lions Member
 * Portal login at /admin/integrations/oidc without redeploying. Secrets
 * are decrypted here and never leave the server.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto/secret-box';

export interface LionsPortalSettings {
  username: string | null;
  password: string | null;
  login_url: string | null;
  data_url: string | null;
  district_code: string | null;
  session_token: string | null;
  session_expires_at: string | null;
  is_active: boolean;
  sandbox_mode: boolean;
}

const TTL_MS = 60_000;
let cache: { value: LionsPortalSettings | null; expiresAt: number } | null = null;

export async function loadLionsPortalSettings(force = false): Promise<LionsPortalSettings | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.value;
  try {
    const db = createAdminClient();
    const { data } = await db
      .from('lions_portal_credentials')
      .select('*')
      .eq('id', 'singleton')
      .maybeSingle();
    let value: LionsPortalSettings | null = null;
    if (data && data.is_active) {
      value = {
        username: decrypt(data.username as string | null),
        password: decrypt(data.password as string | null),
        login_url: (data.login_url as string | null) ?? null,
        data_url: (data.data_url as string | null) ?? null,
        district_code: (data.district_code as string | null) ?? null,
        session_token: decrypt(data.session_token as string | null),
        session_expires_at: (data.session_expires_at as string | null) ?? null,
        is_active: Boolean(data.is_active),
        sandbox_mode: Boolean(data.sandbox_mode),
      };
    }
    cache = { value, expiresAt: now + TTL_MS };
    return value;
  } catch {
    cache = { value: null, expiresAt: now + TTL_MS };
    return null;
  }
}

export function peekLionsPortalSettings(): LionsPortalSettings | null {
  return cache?.value ?? null;
}

export function invalidateLionsPortalCache(): void {
  cache = null;
}
