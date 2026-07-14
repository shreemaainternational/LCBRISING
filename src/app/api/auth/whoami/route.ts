import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Post-login session probe. The login form calls this immediately after a
 * successful client-side sign-in to confirm the server can actually see
 * the session cookie AND resolve a member row — the two things that gate
 * entry to /admin. Returning the reason lets the form show an actionable
 * message instead of silently bouncing back to /login.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // The browser holds a session but the server can't read it from the
    // cookie — a cookie-persistence problem, not a credentials problem.
    return NextResponse.json({ ok: false, reason: 'no_server_session' });
  }

  const member = await getCurrentMember();
  if (!member) {
    // Authenticated, but no members row is linked (and none could be
    // auto-provisioned — usually a missing service-role key on the
    // deployment or a not-yet-added member).
    return NextResponse.json({ ok: false, reason: 'no_member', email: user.email ?? null });
  }

  return NextResponse.json({ ok: true, role: member.role });
}
