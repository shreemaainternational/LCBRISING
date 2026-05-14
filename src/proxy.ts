import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, env } from '@/lib/env';

const ADMIN_PREFIX = '/admin';
const LOGIN_PATH = '/login';

/**
 * Auth middleware. Single role: gate /admin/* behind an authenticated
 * Supabase session.
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
 * Cookie note: Supabase SSR may refresh the session cookie during
 * getUser() and write it onto `response`. Any redirect we return must
 * carry that cookie jar or the refreshed token is lost — see
 * redirectWithCookies().
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

  const path = request.nextUrl.pathname;

  // Only /admin/* needs an auth check — every other path passes
  // through untouched, so /login can never enter a redirect cycle.
  if (!path.startsWith(ADMIN_PREFIX)) return response;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set({ name, value, ...options });
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
