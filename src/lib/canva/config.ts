/**
 * Runtime Canva Connect configuration + OAuth token management.
 *
 * Order of precedence for a usable access token:
 *   1. env.CANVA_API_KEY            — a static service/user token (back-compat)
 *   2. DB singleton `canva_settings` — access token from the OAuth connect
 *      flow, auto-refreshed (and refresh-token-rotated) on expiry.
 *
 * OAuth *app* credentials (client_id / client_secret) are env-first
 * (CANVA_CLIENT_ID / CANVA_CLIENT_SECRET) with a DB fallback so an admin
 * can paste them at /admin/integrations/canva without a Vercel env trip.
 *
 * Mirrors src/lib/ai/openai-config.ts and src/lib/push-config.ts: a short
 * sync cache backs the /admin/integrations health dashboard, while the
 * async helpers do the network work.
 */
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto/secret-box';

export const CANVA_AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize';
export const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

/**
 * Scopes needed to autofill a brand template and export the result.
 * Space-separated per the OAuth 2.0 spec.
 */
export const CANVA_SCOPES = [
  'design:content:read',
  'design:content:write',
  'design:meta:read',
  'brandtemplate:meta:read',
  'brandtemplate:content:read',
  'asset:read',
  'asset:write',
  'profile:read',
].join(' ');

const DEFAULT_CALLBACK_PATH = '/api/canva/oauth/callback';
// Refresh a little early so an in-flight request never races the expiry.
const EXPIRY_SKEW_MS = 60_000;

export interface CanvaOAuthApp {
  clientId: string;
  clientSecret: string;
  /** 'env' when both come from process.env, else 'db'. */
  source: 'env' | 'db';
}

export interface CanvaRuntime {
  /** A usable bearer token exists right now (env static or DB oauth). */
  connected: boolean;
  source: 'env' | 'oauth' | null;
  hasClientCreds: boolean;
  scope: string | null;
  accessTokenExpiresAt: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

interface CanvaRow {
  client_id: string | null;
  client_secret: string | null;
  access_token: string | null;
  refresh_token: string | null;
  access_token_expires_at: string | null;
  scope: string | null;
  connected_at: string | null;
  last_error: string | null;
}

const SELECT =
  'client_id, client_secret, access_token, refresh_token, access_token_expires_at, scope, connected_at, last_error';

const TTL_MS = 30_000;
let cache: { value: CanvaRuntime; expiresAt: number } | null = null;

function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function readRow(): Promise<CanvaRow | null> {
  if (!hasServiceRole()) return null;
  const db = createAdminClient();
  const { data } = await db
    .from('canva_settings')
    .select(SELECT)
    .eq('id', 'singleton')
    .maybeSingle();
  return (data as CanvaRow | null) ?? null;
}

/**
 * Resolve the OAuth app credentials. Env wins; otherwise the DB-stored
 * pair (client_secret decrypted). Returns null when neither is complete.
 */
export async function getCanvaOAuthApp(): Promise<CanvaOAuthApp | null> {
  if (env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET) {
    return { clientId: env.CANVA_CLIENT_ID, clientSecret: env.CANVA_CLIENT_SECRET, source: 'env' };
  }
  const row = await readRow();
  const clientId = row?.client_id ?? null;
  const clientSecret = decrypt(row?.client_secret ?? null);
  if (clientId && clientSecret) {
    return { clientId, clientSecret, source: 'db' };
  }
  return null;
}

/**
 * The exact redirect URI registered with the Canva app. Env-pinned when
 * set (recommended — Canva requires an exact match); otherwise derived
 * from the current request origin.
 */
export function resolveRedirectUri(origin: string): string {
  if (env.CANVA_REDIRECT_URI) return env.CANVA_REDIRECT_URI;
  return new URL(DEFAULT_CALLBACK_PATH, origin).toString();
}

function basicAuth(app: CanvaOAuthApp): string {
  return `Basic ${Buffer.from(`${app.clientId}:${app.clientSecret}`).toString('base64')}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

async function postToken(app: CanvaOAuthApp, form: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      authorization: basicAuth(app),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form).toString(),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Canva token endpoint ${res.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text) as TokenResponse;
}

async function persistTokens(
  tok: TokenResponse,
  opts: { connectedBy?: string | null } = {},
): Promise<void> {
  if (!hasServiceRole()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to store Canva tokens');
  const db = createAdminClient();
  const expiresAt = tok.expires_in
    ? new Date(Date.now() + tok.expires_in * 1000).toISOString()
    : null;
  const patch: Record<string, unknown> = {
    id: 'singleton',
    access_token: encrypt(tok.access_token),
    access_token_expires_at: expiresAt,
    scope: tok.scope ?? CANVA_SCOPES,
    last_error: null,
    connected_at: new Date().toISOString(),
  };
  // Canva rotates the refresh token on every exchange; only overwrite when
  // a new one is returned so we never null out a still-valid token.
  if (tok.refresh_token) patch.refresh_token = encrypt(tok.refresh_token);
  if (opts.connectedBy !== undefined) patch.connected_by = opts.connectedBy;
  const { error } = await db.from('canva_settings').upsert(patch, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  invalidateCanvaCache();
}

/**
 * Exchange an authorization code for tokens and persist them. Called by
 * the OAuth callback route.
 */
export async function exchangeCanvaCode(args: {
  code: string;
  verifier: string;
  redirectUri: string;
  connectedBy?: string | null;
}): Promise<void> {
  const app = await getCanvaOAuthApp();
  if (!app) throw new Error('Canva OAuth app is not configured (client id/secret)');
  const tok = await postToken(app, {
    grant_type: 'authorization_code',
    code: args.code,
    code_verifier: args.verifier,
    redirect_uri: args.redirectUri,
  });
  await persistTokens(tok, { connectedBy: args.connectedBy ?? null });
}

async function refreshAccessToken(app: CanvaOAuthApp, refreshToken: string): Promise<string> {
  try {
    const tok = await postToken(app, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    await persistTokens(tok);
    return tok.access_token;
  } catch (err) {
    // Surface the failure on the settings row so the admin sees why
    // Canva actions started failing.
    if (hasServiceRole()) {
      const db = createAdminClient();
      await db.from('canva_settings')
        .update({ last_error: err instanceof Error ? err.message : String(err) })
        .eq('id', 'singleton');
      invalidateCanvaCache();
    }
    throw err;
  }
}

/**
 * Return a valid bearer access token, refreshing if the stored one has
 * expired. Throws a descriptive error when Canva is not connected.
 */
export async function getCanvaAccessToken(): Promise<string> {
  // 1. Static token (service token or manually pasted user token).
  if (env.CANVA_API_KEY) return env.CANVA_API_KEY;

  // 2. OAuth token from the connect flow.
  const row = await readRow();
  const accessToken = decrypt(row?.access_token ?? null);
  const refreshToken = decrypt(row?.refresh_token ?? null);
  const expiresAt = row?.access_token_expires_at ? Date.parse(row.access_token_expires_at) : 0;

  const stillValid = accessToken && expiresAt && expiresAt - EXPIRY_SKEW_MS > Date.now();
  if (stillValid) return accessToken as string;

  if (refreshToken) {
    const app = await getCanvaOAuthApp();
    if (!app) throw new Error('Canva OAuth app credentials are missing — cannot refresh token');
    return refreshAccessToken(app, refreshToken);
  }

  // Access token present but no refresh token and past expiry (or nothing
  // stored at all): the admin must (re)connect.
  if (accessToken && !expiresAt) return accessToken as string;
  throw new Error('Canva is not connected — connect an account at /admin/integrations/canva');
}

/** Persist admin-entered OAuth app credentials to the DB singleton. */
export async function saveCanvaOAuthApp(args: {
  clientId?: string | null;
  clientSecret?: string | null;
  connectedBy?: string | null;
}): Promise<void> {
  if (!hasServiceRole()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  const db = createAdminClient();
  const patch: Record<string, unknown> = { id: 'singleton' };
  if (args.clientId !== undefined) patch.client_id = args.clientId?.trim() || null;
  if (args.clientSecret !== undefined) {
    patch.client_secret = args.clientSecret ? encrypt(args.clientSecret.trim()) : null;
  }
  const { error } = await db.from('canva_settings').upsert(patch, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  invalidateCanvaCache();
}

/** Drop the stored tokens (keeps the OAuth app credentials). */
export async function disconnectCanva(): Promise<void> {
  if (!hasServiceRole()) return;
  const db = createAdminClient();
  await db.from('canva_settings').update({
    access_token: null,
    refresh_token: null,
    access_token_expires_at: null,
    scope: null,
    connected_at: null,
    last_error: null,
  }).eq('id', 'singleton');
  invalidateCanvaCache();
}

/**
 * Load a lightweight runtime snapshot for the dashboard and populate the
 * sync cache. Never throws — degrades to a disconnected snapshot.
 */
export async function loadCanvaRuntime(force = false): Promise<CanvaRuntime> {
  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.value;

  const envToken = Boolean(env.CANVA_API_KEY);
  let value: CanvaRuntime;
  try {
    const row = await readRow();
    const hasClientCreds = Boolean(
      (env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET) || (row?.client_id && row?.client_secret),
    );
    const hasOauthToken = Boolean(row?.access_token);
    value = {
      connected: envToken || hasOauthToken,
      source: envToken ? 'env' : hasOauthToken ? 'oauth' : null,
      hasClientCreds,
      scope: row?.scope ?? null,
      accessTokenExpiresAt: row?.access_token_expires_at ?? null,
      connectedAt: row?.connected_at ?? null,
      lastError: row?.last_error ?? null,
    };
  } catch {
    value = {
      connected: envToken,
      source: envToken ? 'env' : null,
      hasClientCreds: Boolean(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET),
      scope: null,
      accessTokenExpiresAt: null,
      connectedAt: null,
      lastError: null,
    };
  }
  cache = { value, expiresAt: now + TTL_MS };
  return value;
}

export function peekCanvaRuntime(): CanvaRuntime | null {
  if (cache) return cache.value;
  if (env.CANVA_API_KEY) {
    return {
      connected: true, source: 'env',
      hasClientCreds: Boolean(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET),
      scope: null, accessTokenExpiresAt: null, connectedAt: null, lastError: null,
    };
  }
  return null;
}

export function invalidateCanvaCache(): void {
  cache = null;
}

/** Sync, cache-only: is Canva usable right now? Backs the registry. */
export function isCanvaConnected(): boolean {
  return Boolean(peekCanvaRuntime()?.connected);
}

/** True when connected via the DB OAuth flow rather than a pinned env token. */
export function isCanvaOAuthConnected(): boolean {
  return peekCanvaRuntime()?.source === 'oauth';
}
