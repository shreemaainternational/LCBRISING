import { NextRequest, NextResponse } from 'next/server';
import { discover, getOidcConfig, isOidcConfigured } from '@/lib/oidc';
import { writeAudit } from '@/lib/audit';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await loadOidcSettings();
  const returnTo = req.nextUrl.searchParams.get('return_to') ?? '/';
  await writeAudit({
    action: 'oauth.logout',
    actor_label: 'oidc',
    ip_address: req.headers.get('x-forwarded-for') ?? null,
    user_agent: req.headers.get('user-agent') ?? null,
  });

  if (!isOidcConfigured()) {
    return NextResponse.redirect(new URL(returnTo, req.nextUrl.origin));
  }

  try {
    const doc = await discover();
    if (doc.end_session_endpoint) {
      const cfg = getOidcConfig();
      const params = new URLSearchParams({
        client_id: cfg.clientId,
        post_logout_redirect_uri: new URL(returnTo, req.nextUrl.origin).toString(),
      });
      return NextResponse.redirect(`${doc.end_session_endpoint}?${params.toString()}`);
    }
  } catch {
    // fall through to local redirect
  }
  return NextResponse.redirect(new URL(returnTo, req.nextUrl.origin));
}
