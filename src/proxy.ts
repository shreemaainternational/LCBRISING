import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, isDevAuthBypass, env } from '@/lib/env';

const ADMIN_PREFIX = '/admin';
const LOGIN_PATH = '/login';

/**
 * Auth middleware with two jobs:
 *
 *   1. Keep the Supabase session fresh on EVERY authenticated request
 *      (pages, API routes, server actions). Supabase rotates the
 *      refresh token during getUser(); the rotated cookie must be
 *      written back at the network boundary or later requests race
 *      against a stale token and fail auth. The original code only
 *      refreshed on /admin/* and returned early everywhere else, so a
 *      POST to /api/* never got a refreshed session — the route
 *      handler then saw an expired cookie and returned
 *      "unauthenticated" even though the page had rendered fine.
 *   2. Gate /admin/* behind an authenticated session (redirect to
 *      /login when there is no user).
 *
 * Deliberately does NOT redirect already-authed users away from
 * /login. That convenience rule caused ERR_TOO_MANY_REDIRECTS:
 * supabase.auth.getUser() makes a network validation call that can
 * return inconsistent results across rapid requests (stale-but-present
 * cookie, in-flight token refresh). With both a "/admin needs user"
 * rule AND a "/login bounces user" rule, an inconsistent getUser()
 * ping-pongs the browser forever. Keeping /login as a terminal route
 * (never redirects) makes the loop structurally impossible.
 *
 * Cookie note: refreshed cookies are written to BOTH the request (so
 * the downstream page/route handler reads the fresh token in the same
 * pass) and the response (so the browser stores it). Any redirect we
 * return must carry that cookie jar — see redirectWithCookies().
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  const path = request.nextUrl.pathname;

  // Defensive: collapse accidental /admin/admin/* (typo or doubled
  // base path) to /admin/* before any auth logic runs.
  const doubled = /^\/admin(\/admin)+(?=\/|$)/;
  if (doubled.test(path)) {
    const url = request.nextUrl.clone();
    url.pathname = path.replace(doubled, '/admin');
    return NextResponse.redirect(url, 308);
  }

  const isAdminPath = path.startsWith(ADMIN_PREFIX);

  // Development-only bypass (ADMIN_AUTH_BYPASS=1 in a non-production
  // build). Hard-disabled in production so /admin/* is never public.
  if (isDevAuthBypass()) return response;

  // Skip the network round-trip on requests that have nothing to
  // refresh and nothing to guard: no Supabase session cookie AND not
  // an /admin path. This keeps public pages fast while still refreshing
  // the session on every authenticated request (including /api/*).
  const hasSessionCookie = request.cookies.getAll().some((c) => /^sb-.*-auth-token/.test(c.name));
  if (!isAdminPath && !hasSessionCookie) return response;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          // Update the request so the downstream handler reads the
          // refreshed token, then rebuild the response bound to it and
          // mirror the cookies so the browser persists them.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set({ name, value, ...options });
          }
        },
      },
    },
  );

  // IMPORTANT: refreshes and persists the session for this request.
  const { data: { user } } = await supabase.auth.getUser();

  // Only /admin/* gets the redirect-to-login treatment.
  if (isAdminPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set('redirectTo', path);
    return redirectWithCookies(url, response);
  }

  return response;
}

/**
 * NextResponse.redirect that carries every Set-Cookie the upstream
 * `response` accumulated, so a refreshed Supabase session cookie is
 * never dropped on a redirect.
 */
function redirectWithCookies(url: URL, source: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  source.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c);
  });
  return redirect;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)'],
};
