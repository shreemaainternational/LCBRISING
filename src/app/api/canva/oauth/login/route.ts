import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { generatePkce, generateState } from '@/lib/oidc/pkce';
import { CANVA_COOKIE, canvaCookieOptions } from '@/lib/canva/cookies';
import {
  CANVA_AUTHORIZE_URL,
  CANVA_SCOPES,
  getCanvaOAuthApp,
  resolveRedirectUri,
} from '@/lib/canva/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Start the Canva Connect OAuth 2.0 (PKCE) flow. Admin-only. Redirects the
 * browser to Canva's consent screen; the grant comes back to
 * /api/canva/oauth/callback.
 */
export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }

  const app = await getCanvaOAuthApp();
  if (!app) {
    return NextResponse.json(
      {
        error: 'canva_not_configured',
        message:
          'Set the Canva OAuth app client id/secret at /admin/integrations/canva (or CANVA_CLIENT_ID / CANVA_CLIENT_SECRET) before connecting.',
      },
      { status: 503 },
    );
  }

  const { verifier, challenge, method } = generatePkce();
  const state = generateState();
  const redirectUri = resolveRedirectUri(req.nextUrl.origin);

  const authUrl = new URL(CANVA_AUTHORIZE_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', app.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', CANVA_SCOPES);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', method);
  authUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authUrl);
  const opts = canvaCookieOptions();
  res.cookies.set(CANVA_COOKIE.state, state, opts);
  res.cookies.set(CANVA_COOKIE.verifier, verifier, opts);
  // Persist the exact redirect_uri so the callback exchanges with a match.
  res.cookies.set(CANVA_COOKIE.redirect, redirectUri, opts);
  return res;
}
