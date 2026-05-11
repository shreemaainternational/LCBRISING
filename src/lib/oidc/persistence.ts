import { createAdminClient } from '@/lib/supabase/server';
import type { TokenResponse, UserInfo } from './client';

export type UpsertInput = {
  provider: string;
  profile: UserInfo;
  tokens: TokenResponse;
};

/**
 * Persist (or refresh) the OAuth account row keyed by (provider, subject).
 * Requires SUPABASE_SERVICE_ROLE_KEY (admin client). Safe no-op when the
 * service role is not configured (useful during local dev without Supabase).
 */
export async function upsertOAuthAccount(input: UpsertInput): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const supa = createAdminClient();
  const now = new Date();
  const accessExp = input.tokens.expires_in
    ? new Date(now.getTime() + input.tokens.expires_in * 1000).toISOString()
    : null;
  const refreshExp = input.tokens.refresh_expires_in
    ? new Date(now.getTime() + input.tokens.refresh_expires_in * 1000).toISOString()
    : null;

  await supa
    .from('oauth_accounts')
    .upsert(
      {
        provider: input.provider,
        subject: input.profile.sub,
        email: input.profile.email ?? null,
        email_verified: input.profile.email_verified ?? null,
        raw_profile: input.profile as unknown as Record<string, unknown>,
        access_token: input.tokens.access_token,
        refresh_token: input.tokens.refresh_token ?? null,
        id_token: input.tokens.id_token ?? null,
        token_type: input.tokens.token_type ?? null,
        scope: input.tokens.scope ?? null,
        access_token_expires_at: accessExp,
        refresh_token_expires_at: refreshExp,
        updated_at: now.toISOString(),
      },
      { onConflict: 'provider,subject' },
    );
}
