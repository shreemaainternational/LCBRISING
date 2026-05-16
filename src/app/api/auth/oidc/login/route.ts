import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizationRequest, isOidcConfigured, isOidcSandboxActive } from '@/lib/oidc';
import { OIDC_COOKIE, transientCookieOptions } from '@/lib/oidc/cookies';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await loadOidcSettings();
  const returnTo = req.nextUrl.searchParams.get('return_to') ?? '/admin';

  // Sandbox short-circuit — sign the user in as a synthetic Lion
  // without leaving the app. Useful before real LCI credentials are
  // configured.
  if (isOidcSandboxActive()) {
    const url = new URL('/api/auth/oidc/sandbox', req.url);
    url.searchParams.set('return_to', returnTo);
    const as = req.nextUrl.searchParams.get('as');
    if (as) url.searchParams.set('as', as);
    return NextResponse.redirect(url);
  }

  if (!isOidcConfigured()) {
    return NextResponse.json(
      { error: 'oidc_not_configured', message: 'OIDC is not configured. Visit /admin/integrations/oidc to set it up or enable sandbox mode.' },
      { status: 503 },
    );
  }

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
