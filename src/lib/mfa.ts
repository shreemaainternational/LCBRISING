/**
 * Two-factor authentication (TOTP — Google Authenticator, Authy, 1Password…)
 * for the CRM, built on Supabase Auth's native MFA.
 *
 * Supabase issues an `aal1` session after the password step and an `aal2`
 * session once a verified TOTP factor's code has been checked. The rules:
 *
 *   - A user WITH a verified factor must be at `aal2` to use /admin or any
 *     admin API. At `aal1` they are sent to the code prompt on /login.
 *   - A user WITHOUT a verified factor is sent to /admin/settings/mfa to
 *     enrol, while MFA is required (the default). Set MFA_REQUIRED=0 to make
 *     enrolment optional; enrolled users are then still always challenged.
 *
 * Kept free of `next/*` imports so the proxy (middleware) can use it.
 */

export const MFA_SETTINGS_PATH = '/admin/settings/mfa';

type FactorLike = { status?: string; factor_type?: string };
type UserLike = { factors?: FactorLike[] | null } | null | undefined;

/** True unless MFA_REQUIRED is explicitly switched off. */
export function isMfaRequired(): boolean {
  const v = (process.env.MFA_REQUIRED ?? '').trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

/** Verified TOTP factors on an auth user (as returned by getUser()). */
export function hasVerifiedTotp(user: UserLike): boolean {
  return !!user?.factors?.some((f) => f.status === 'verified' && f.factor_type === 'totp');
}

/** Reads the `aal` claim from a Supabase access token without verifying it. */
export function tokenAal(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null;
  const part = accessToken.split('.')[1];
  if (!part) return null;
  try {
    const json = JSON.parse(
      typeof atob === 'function'
        ? atob(part.replace(/-/g, '+').replace(/_/g, '/'))
        : Buffer.from(part, 'base64url').toString('utf8'),
    );
    return typeof json.aal === 'string' ? json.aal : null;
  } catch {
    return null;
  }
}

export type MfaState = {
  enrolled: boolean;
  aal: string | null;
  /** Enrolled but this session has not passed the code step yet. */
  needsChallenge: boolean;
  /** MFA is required and the user has not enrolled an authenticator yet. */
  needsEnrollment: boolean;
};

/**
 * `user` must come from a network-validated getUser() call (its factor list
 * is authoritative); `accessToken` is the session's JWT, which carries the
 * aal the user actually reached. The token is trusted only because getUser()
 * already validated the same session.
 */
export function computeMfaState(user: UserLike, accessToken: string | null | undefined): MfaState {
  const enrolled = hasVerifiedTotp(user);
  const aal = tokenAal(accessToken);
  return {
    enrolled,
    aal,
    needsChallenge: enrolled && aal !== 'aal2',
    needsEnrollment: !enrolled && isMfaRequired(),
  };
}

/** Normalises a typed backup code: upper-case, strips spaces and dashes. */
export function normalizeBackupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
