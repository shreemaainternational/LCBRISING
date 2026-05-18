import { createAdminClient } from '@/lib/supabase/server';
import type { LionsRole } from '@/lib/supabase/database.types';
import { encrypt } from '@/lib/crypto/secret-box';
import type { TokenResponse, UserInfo } from './client';

const VALID_LIONS_ROLES: ReadonlySet<LionsRole> = new Set([
  'international_admin', 'multiple_district_admin', 'district_governor',
  'vice_district_governor', 'cabinet_officer', 'region_chairperson',
  'zone_chairperson', 'club_president', 'club_secretary', 'club_treasurer',
  'club_officer', 'member', 'guest_viewer',
]);

function pickLionsRole(roles: unknown): LionsRole | null {
  if (!Array.isArray(roles)) return null;
  for (const r of roles) {
    if (typeof r === 'string' && VALID_LIONS_ROLES.has(r as LionsRole)) {
      return r as LionsRole;
    }
  }
  return null;
}

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
export async function upsertOAuthAccount(input: UpsertInput): Promise<{ id: string | null }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { id: null };

  const supa = createAdminClient();
  const now = new Date();
  const accessExp = input.tokens.expires_in
    ? new Date(now.getTime() + input.tokens.expires_in * 1000).toISOString()
    : null;
  const refreshExp = input.tokens.refresh_expires_in
    ? new Date(now.getTime() + input.tokens.refresh_expires_in * 1000).toISOString()
    : null;

  // Link to an existing member by email or lions_member_id so the
  // OAuth account is connected to its CRM row.
  let memberId: string | null = null;
  const lionsId = input.profile.lions_member_id;
  if (lionsId) {
    const { data } = await supa
      .from('members')
      .select('id')
      .eq('lions_member_id', lionsId)
      .maybeSingle();
    memberId = data?.id ?? null;
  }
  if (!memberId && input.profile.email) {
    const { data } = await supa
      .from('members')
      .select('id')
      .eq('email', input.profile.email)
      .maybeSingle();
    memberId = data?.id ?? null;
  }

  const { data: account } = await supa
    .from('oauth_accounts')
    .upsert(
      {
        provider: input.provider,
        subject: input.profile.sub,
        member_id: memberId,
        email: input.profile.email ?? null,
        email_verified: input.profile.email_verified ?? null,
        raw_profile: input.profile as unknown as Record<string, unknown>,
        access_token: encrypt(input.tokens.access_token),
        refresh_token: encrypt(input.tokens.refresh_token ?? null),
        id_token: encrypt(input.tokens.id_token ?? null),
        token_type: input.tokens.token_type ?? null,
        scope: input.tokens.scope ?? null,
        access_token_expires_at: accessExp,
        refresh_token_expires_at: refreshExp,
        updated_at: now.toISOString(),
      },
      { onConflict: 'provider,subject' },
    )
    .select('id')
    .single();

  // Promote claims onto the linked member row when present.
  if (memberId) {
    const update: Record<string, unknown> = { last_sync_at: now.toISOString() };
    if (input.profile.lions_member_id) update.lions_member_id = input.profile.lions_member_id;
    const claimedRole = pickLionsRole(input.profile.roles);
    if (claimedRole) update.lions_role = claimedRole;
    if (typeof input.profile.district_code === 'string') {
      const { data: d } = await supa
        .from('districts')
        .select('id')
        .eq('code', input.profile.district_code)
        .maybeSingle();
      if (d?.id) update.district_id = d.id;
    }
    if (typeof input.profile.club_id === 'string') {
      update.club_id = input.profile.club_id;
    }
    await supa.from('members').update(update).eq('id', memberId);
  }

  return { id: account?.id ?? null };
}
