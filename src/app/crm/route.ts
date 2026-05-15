import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Direct CRM entry — sets the lcbr_crm cookie and forwards to /admin.
 * The middleware and getCurrentMember() honor that cookie to skip the
 * normal auth gate, so you land in the dashboard without logging in.
 *
 * Anyone who knows this URL can access /admin. Treat the link as
 * sensitive and remove the cookie / disable this route when no longer
 * needed (delete src/app/crm or clear the lcbr_crm cookie).
 */
export function GET(req: NextRequest) {
  const dest = new URL('/admin', req.url);
  const res = NextResponse.redirect(dest);
  res.cookies.set('lcbr_crm', '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  });
  return res;
}
