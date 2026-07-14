import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { CANVA_COOKIE } from '@/lib/canva/cookies';
import { exchangeCanvaCode } from '@/lib/canva/config';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SETTINGS_PATH = '/admin/integrations/canva';

function clearTransient(res: NextResponse) {
  for (const c of [CANVA_COOKIE.state, CANVA_COOKIE.verifier, CANVA_COOKIE.redirect]) {
    res.cookies.set(c, '', { path: '/', maxAge: 0 });
  }
}

function back(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL(SETTINGS_PATH, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  clearTransient(res);
  return res;
}

/**
 * Canva OAuth redirect target. Validates CSRF state, exchanges the code
 * (with the PKCE verifier) for tokens, persists them, and bounces back to
 * the settings page with a status flag.
 */
export async function GET(req: NextRequest) {
  let actor: { id: string } | null = null;
  try { actor = (await requireAdmin()) as { id: string }; }
  catch (err) { if (err instanceof Response) return err; throw err; }

  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');
  if (providerError) {
    return back(req, { error: providerError.slice(0, 120) });
  }
  if (!code || !state) {
    return back(req, { error: 'missing_code_or_state' });
  }

  const cookieState = req.cookies.get(CANVA_COOKIE.state)?.value;
  const verifier = req.cookies.get(CANVA_COOKIE.verifier)?.value;
  const redirectUri = req.cookies.get(CANVA_COOKIE.redirect)?.value;
  if (!cookieState || !verifier || !redirectUri) {
    return back(req, { error: 'missing_session_cookies' });
  }
  if (cookieState !== state) {
    return back(req, { error: 'state_mismatch' });
  }

  try {
    await exchangeCanvaCode({ code, verifier, redirectUri, connectedBy: actor?.id ?? null });
    await writeAudit({
      action: 'canva.connect',
      entity: 'canva_settings',
      payload: { id: 'singleton', by: actor?.id ?? null },
      actor_label: 'admin',
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    }).catch(() => {});
    return back(req, { connected: '1' });
  } catch (err) {
    return back(req, { error: (err instanceof Error ? err.message : 'exchange_failed').slice(0, 200) });
  }
}
