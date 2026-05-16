/**
 * Runtime-overridable OIDC config. Reads from a DB singleton if the
 * `lions_oidc_settings` table is populated and active — otherwise
 * falls back to env vars. Keeps an in-memory cache so we don't hit
 * the DB on every request.
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface OidcSettings {
  issuer: string | null;
  client_id: string | null;
  client_secret: string | null;
  redirect_uri: string | null;
  scopes: string | null;
  audience: string | null;
  provider_label: string | null;
  discovery_url: string | null;
  is_active: boolean;
  sandbox_mode?: boolean;
}

const TTL_MS = 60_000;
let cache: { value: OidcSettings | null; expiresAt: number } | null = null;
let inflight: Promise<OidcSettings | null> | null = null;

function emptySettings(): OidcSettings {
  return {
    issuer: null, client_id: null, client_secret: null, redirect_uri: null,
    scopes: null, audience: null, provider_label: null, discovery_url: null,
    is_active: false,
  };
}

/**
 * Load the active OIDC settings row. Returns null if no service-role
 * client (env-only mode) or no row exists yet.
 */
export async function loadOidcSettings(force = false): Promise<OidcSettings | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.value;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const db = createAdminClient();
      const { data } = await db.from('lions_oidc_settings').select('*').eq('id', 'singleton').maybeSingle();
      const value = (data && data.is_active ? data : null) as OidcSettings | null;
      cache = { value, expiresAt: now + TTL_MS };
      return value;
    } catch {
      cache = { value: null, expiresAt: now + TTL_MS };
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Force the cache to reload on the next call. */
export function invalidateOidcSettingsCache(): void {
  cache = null;
  inflight = null;
}

/** Synchronous accessor — returns whatever was last cached. */
export function peekOidcSettings(): OidcSettings | null {
  return cache?.value ?? null;
}

/** Best-effort sync configured check — used by client-rendered status badges. */
export async function isOidcConfiguredAsync(): Promise<boolean> {
  const s = await loadOidcSettings();
  if (s && s.issuer && s.client_id && s.redirect_uri) return true;
  return Boolean(
    process.env.LIONS_OIDC_ISSUER &&
    process.env.LIONS_OIDC_CLIENT_ID &&
    process.env.LIONS_OIDC_REDIRECT_URI,
  );
}
