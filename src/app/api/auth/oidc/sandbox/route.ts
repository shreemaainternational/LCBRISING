/**
 * Sandbox Lions sign-in. Activated by toggling sandbox_mode on the
 * lions_oidc_settings row from /admin/integrations/oidc.
 *
 * Provisions (or reuses) a synthetic Lion via the Supabase service
 * role, attaches a synthetic lions_member_id + lions_role + club_id
 * (best-effort) and starts a Supabase session by emailing a magic
 * link with the redirect baked in. Designed for end-to-end testing
 * of the Lions OIDC flow before real LCI credentials are in place.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { loadOidcSettings } from '@/lib/oidc/runtime-config';
import { isOidcSandboxActive } from '@/lib/oidc';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SandboxIdentity {
  email: string;
  name: string;
  lions_member_id: string;
  lions_role: 'club_president' | 'district_governor' | 'zone_chairperson' | 'region_chairperson' | 'multiple_district_admin' | 'member';
  club_external_id: string;
  district_code: string;
}

const SANDBOX_PROFILES: SandboxIdentity[] = [
  { email: 'sandbox.president@lcbarodarisingstar.in',  name: 'Lion Sandbox President',  lions_member_id: 'LCI-SBX-0001', lions_role: 'club_president',           club_external_id: 'SBX-CLUB-1', district_code: '3232 F1' },
  { email: 'sandbox.governor@lcbarodarisingstar.in',   name: 'Lion Sandbox Governor',   lions_member_id: 'LCI-SBX-0002', lions_role: 'district_governor',        club_external_id: 'SBX-CLUB-1', district_code: '3232 F1' },
  { email: 'sandbox.zonechair@lcbarodarisingstar.in',  name: 'Lion Sandbox Zone Chair', lions_member_id: 'LCI-SBX-0003', lions_role: 'zone_chairperson',         club_external_id: 'SBX-CLUB-1', district_code: '3232 F1' },
];

function pickProfile(req: NextRequest): SandboxIdentity {
  const want = req.nextUrl.searchParams.get('as') ?? 'president';
  if (want === 'governor')   return SANDBOX_PROFILES[1];
  if (want === 'zone' || want === 'chair') return SANDBOX_PROFILES[2];
  return SANDBOX_PROFILES[0];
}

export async function GET(req: NextRequest) {
  // Hard-disabled in production. This route mints a real, privileged
  // session for a synthetic identity — a testing tool only. Gating it
  // on NODE_ENV ensures a stray sandbox_mode toggle can never expose
  // admin access on the live site.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'sandbox_disabled_in_production' }, { status: 404 });
  }

  await loadOidcSettings(true);
  if (!isOidcSandboxActive()) {
    return NextResponse.json({ error: 'sandbox_disabled', message: 'Enable sandbox mode at /admin/integrations/oidc first.' }, { status: 503 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service_role_missing' }, { status: 503 });
  }

  const profile = pickProfile(req);
  const returnTo = req.nextUrl.searchParams.get('return_to') ?? '/admin';
  const db = createAdminClient();

  // 1. Ensure an auth user exists for the synthetic email.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth = (db as any).auth?.admin;
  let userId: string | null = null;
  if (auth?.listUsers && auth?.createUser) {
    try {
      const { data: users } = await auth.listUsers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = users?.users?.find?.((u: any) => u.email?.toLowerCase() === profile.email.toLowerCase());
      if (existing) userId = existing.id;
      if (!userId) {
        const { data: created } = await auth.createUser({
          email: profile.email,
          email_confirm: true,
          user_metadata: { name: profile.name, sandbox: true, source: 'lions_oidc_sandbox' },
        });
        userId = created?.user?.id ?? null;
      }
    } catch (e) { console.error('sandbox auth provisioning failed:', e); }
  }

  // 2. Ensure a member row is linked + tagged with the Lions claims.
  const { data: existingMember } = await db.from('members').select('id').eq('email', profile.email).maybeSingle();
  let memberId: string | null = existingMember?.id ?? null;
  if (!memberId) {
    const { data: created } = await db.from('members').insert({
      user_id: userId,
      name: profile.name,
      email: profile.email,
      role: profile.lions_role === 'district_governor' ? 'admin' : profile.lions_role === 'club_president' ? 'president' : 'officer',
      lions_role: profile.lions_role,
      lions_member_id: profile.lions_member_id,
      status: 'active',
    }).select('id').single();
    memberId = created?.id ?? null;
  } else if (userId) {
    await db.from('members').update({
      user_id: userId,
      lions_role: profile.lions_role,
      lions_member_id: profile.lions_member_id,
      last_sync_at: new Date().toISOString(),
    }).eq('id', memberId);
  }

  await writeAudit({
    action: 'oauth.sandbox_signin',
    actor_member_id: memberId,
    entity: 'member',
    entity_id: memberId,
    payload: { profile: profile.email, role: profile.lions_role, sandbox: true },
  });

  // 3. Use the service role to mint a magic-link URL we redirect into.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generate = (auth as any)?.generateLink;
  if (generate && userId) {
    try {
      const { data } = await generate.call(auth, {
        type: 'magiclink',
        email: profile.email,
        options: { redirectTo: new URL(returnTo, req.url).toString() },
      });
      const actionLink = data?.properties?.action_link as string | undefined;
      if (actionLink) {
        return NextResponse.redirect(actionLink);
      }
    } catch (e) { console.error('magic link mint failed:', e); }
  }

  // 4. If we reach here the magic link could not be minted (no service
  //    role / generateLink unavailable). Fail explicitly rather than
  //    granting access — the old cookie shortcut has been removed.
  return NextResponse.json(
    { error: 'sandbox_signin_failed', message: 'Could not mint a sandbox session. Ensure the service role key is set.' },
    { status: 500 },
  );
}
