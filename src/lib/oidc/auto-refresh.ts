/**
 * Token rotation helper. Returns a valid access_token for a given
 * oauth_accounts row, refreshing it via refresh_token if it's within
 * `leewaySeconds` of expiry. Persists the new tokens (encrypted)
 * back to the row so adapters never see a stale token.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from '@/lib/crypto/secret-box';
import { refreshAccessToken } from './client';

const DEFAULT_LEEWAY_S = 60;

export type ValidToken = {
  access_token: string;
  expires_at: string | null;
  rotated: boolean;
};

export async function getValidAccessToken(
  oauthAccountId: string,
  leewaySeconds = DEFAULT_LEEWAY_S,
): Promise<ValidToken> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('getValidAccessToken: SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  const supa = createAdminClient();
  const { data, error } = await supa
    .from('oauth_accounts')
    .select('id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at')
    .eq('id', oauthAccountId)
    .maybeSingle();
  if (error || !data) throw new Error(`oauth_accounts row ${oauthAccountId} not found`);

  const accessPlain = decrypt(data.access_token as string | null);
  const refreshPlain = decrypt(data.refresh_token as string | null);
  const expiresAt = data.access_token_expires_at as string | null;

  const needsRefresh =
    !accessPlain ||
    !expiresAt ||
    new Date(expiresAt).getTime() - Date.now() < leewaySeconds * 1000;

  if (!needsRefresh) {
    return { access_token: accessPlain!, expires_at: expiresAt, rotated: false };
  }
  if (!refreshPlain) {
    throw new Error('access token expired and no refresh_token available');
  }

  const tok = await refreshAccessToken(refreshPlain);
  const now = new Date();
  const newExp = tok.expires_in
    ? new Date(now.getTime() + tok.expires_in * 1000).toISOString()
    : null;
  const newRefreshExp = tok.refresh_expires_in
    ? new Date(now.getTime() + tok.refresh_expires_in * 1000).toISOString()
    : null;

  await supa
    .from('oauth_accounts')
    .update({
      access_token: encrypt(tok.access_token),
      refresh_token: encrypt(tok.refresh_token ?? refreshPlain),
      id_token: tok.id_token ? encrypt(tok.id_token) : undefined,
      access_token_expires_at: newExp,
      refresh_token_expires_at: newRefreshExp ?? data.refresh_token_expires_at,
      updated_at: now.toISOString(),
    })
    .eq('id', oauthAccountId);

  return { access_token: tok.access_token, expires_at: newExp, rotated: true };
}
