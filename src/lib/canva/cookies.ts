import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/** Transient cookies for the Canva OAuth round-trip (PKCE + CSRF state). */
export const CANVA_COOKIE = {
  state: 'lcr.canva.state',
  verifier: 'lcr.canva.cv',
  redirect: 'lcr.canva.ru',
} as const;

export function canvaCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes — the auth round-trip window
  };
}
