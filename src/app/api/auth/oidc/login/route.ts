import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizationRequest, isOidcConfigured } from '@/lib/oidc';
import { OIDC_COOKIE, transientCookieOptions } from '@/lib/oidc/cookies';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isOidcConfigured()) {
    return NextResponse.json(
      { error: 'oidc_not_configured', message: 'OIDC environment variables are not set.' },
      { status: 503 },
    );
  }

  const returnTo = req.nextUrl.searchParams.get('return_to') ?? '/admin';

  try {
    const { url, state, nonce, codeVerifier } = await buildAuthorizationRequest();
    const res = NextResponse.redirect(url);
    const opts = transientCookieOptions();
    res.cookies.set(OIDC_COOKIE.state, state, opts);
    res.cookies.set(OIDC_COOKIE.nonce, nonce, opts);
    res.cookies.set(OIDC_COOKIE.verifier, codeVerifier, opts);
    res.cookies.set(OIDC_COOKIE.returnTo, returnTo, opts);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'oidc_login_error';
    return NextResponse.json({ error: 'oidc_login_failed', message }, { status: 500 });
  }
}
