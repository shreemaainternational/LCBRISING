import { NextRequest, NextResponse } from 'next/server';
import {
  decodeIdToken,
  exchangeCode,
  fetchUserInfo,
  isOidcConfigured,
} from '@/lib/oidc';
import { OIDC_COOKIE } from '@/lib/oidc/cookies';
import { upsertOAuthAccount } from '@/lib/oidc/persistence';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function clearTransientCookies(res: NextResponse) {
  for (const c of [
    OIDC_COOKIE.state,
    OIDC_COOKIE.nonce,
    OIDC_COOKIE.verifier,
    OIDC_COOKIE.returnTo,
  ]) {
    res.cookies.set(c, '', { path: '/', maxAge: 0 });
  }
}

export async function GET(req: NextRequest) {
  if (!isOidcConfigured()) {
    return NextResponse.json(
      { error: 'oidc_not_configured' },
      { status: 503 },
    );
  }

  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: 'oidc_provider_error', detail: error, description: url.searchParams.get('error_description') },
      { status: 400 },
    );
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing_code_or_state' }, { status: 400 });
  }

  const cookieState = req.cookies.get(OIDC_COOKIE.state)?.value;
  const cookieVerifier = req.cookies.get(OIDC_COOKIE.verifier)?.value;
  const cookieNonce = req.cookies.get(OIDC_COOKIE.nonce)?.value;
  const returnTo = req.cookies.get(OIDC_COOKIE.returnTo)?.value || '/admin';

  if (!cookieState || !cookieVerifier) {
    return NextResponse.json({ error: 'missing_session_cookies' }, { status: 400 });
  }
  if (cookieState !== state) {
    return NextResponse.json({ error: 'state_mismatch' }, { status: 400 });
  }

  try {
    const tokens = await exchangeCode(code, cookieVerifier);

    // Nonce check against id_token, if present.
    if (tokens.id_token && cookieNonce) {
      const claims = decodeIdToken(tokens.id_token) ?? {};
      if (typeof claims.nonce === 'string' && claims.nonce !== cookieNonce) {
        return NextResponse.json({ error: 'nonce_mismatch' }, { status: 400 });
      }
    }

    const profile = await fetchUserInfo(tokens.access_token);

    await upsertOAuthAccount({ provider: 'lions', profile, tokens });

    await writeAudit({
      action: 'oauth.login',
      entity: 'oauth_account',
      payload: { provider: 'lions', subject: profile.sub, email: profile.email ?? null },
      actor_label: 'oidc',
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    });

    const safeReturn = returnTo.startsWith('/') ? returnTo : '/admin';
    const res = NextResponse.redirect(new URL(safeReturn, req.nextUrl.origin));
    clearTransientCookies(res);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'callback_failed';
    const res = NextResponse.json({ error: 'oidc_callback_failed', message }, { status: 500 });
    clearTransientCookies(res);
    return res;
  }
}
