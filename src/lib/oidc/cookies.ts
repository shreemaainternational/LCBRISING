import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const OIDC_COOKIE = {
  state: 'lcr.oidc.state',
  nonce: 'lcr.oidc.nonce',
  verifier: 'lcr.oidc.cv',
  returnTo: 'lcr.oidc.rt',
} as const;

export function transientCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes — auth round-trip window
  };
}
