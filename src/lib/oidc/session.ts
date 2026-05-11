import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export type DeviceContext = {
  user_agent: string | null;
  ip_address: string | null;
  device_label?: string | null;
};

export type CreatedSession = {
  id: string;
  token: string; // returned to the caller — never persisted in clear
  expires_at: string;
};

const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Mint a new oauth_sessions row. Returns the opaque session token (random
 * 32 bytes, base64url-encoded). Only the SHA-256 hash is stored.
 *
 * No-op (returns null) when SUPABASE_SERVICE_ROLE_KEY is absent.
 */
export async function createSession(args: {
  oauthAccountId: string;
  userId: string | null;
  device: DeviceContext;
}): Promise<CreatedSession | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const token = base64url(randomBytes(32));
  const hash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  const supa = createAdminClient();
  const { data, error } = await supa
    .from('oauth_sessions')
    .insert({
      oauth_account_id: args.oauthAccountId,
      user_id: args.userId,
      session_token_hash: hash,
      user_agent: args.device.user_agent,
      ip_address: args.device.ip_address,
      device_label: args.device.device_label ?? null,
      expires_at: expiresAt,
      last_seen_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) return null;
  return { id: data.id, token, expires_at: expiresAt };
}

export async function revokeSession(sessionId: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const supa = createAdminClient();
  await supa
    .from('oauth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId);
}
