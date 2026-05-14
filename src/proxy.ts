import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, env } from '@/lib/env';

const ADMIN_PREFIX = '/admin';
const LOGIN_PATH = '/login';

/**
 * Auth middleware. Two roles:
 *   1. Gate /admin/* behind an authenticated Supabase session.
 *   2. Bounce already-authed users away from /login.
 *
 * The non-obvious bit: Supabase SSR may *refresh* the session cookie
 * during getUser() and write the new value onto `response`. If we
 * then return a fresh NextResponse.redirect(), those refreshed
 * cookies are lost — the browser never receives them, so the next
 * request lands authed-but-different and we redirect again, forever
 * (ERR_TOO_MANY_REDIRECTS).
 *
 * Fix: ALWAYS copy the cookie jar from the working `response` onto
 * any redirect we return.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) return response;

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
  const path = request.nextUrl.pathname;

  if (path.startsWith(ADMIN_PREFIX) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set('redirectTo', path);
    return redirectWithCookies(url, response);
  }

  if (path === LOGIN_PATH && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.searchParams.delete('redirectTo');
    return redirectWithCookies(url, response);
  }

  return response;
}

/**
 * Build a NextResponse.redirect that carries every Set-Cookie the
 * upstream `response` has accumulated. Without this, refreshed
 * Supabase session cookies get dropped on the redirect and the
 * browser ping-pongs between /admin and /login.
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
