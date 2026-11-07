import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { computeMfaState, normalizeBackupCode } from '@/lib/mfa';
import { hashBackupCode, hashesEqual } from '@/lib/mfa-backup';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST { code } — lost-authenticator recovery.
 *
 * Requires the password step to have already succeeded (an aal1 session).
 * A valid, unused backup code removes the user's TOTP factor(s) and burns
 * every remaining backup code; the user is then sent to enrol a new
 * authenticator (the proxy enforces that while MFA is required).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in with your password first.' }, { status: 401 });

  const ip = clientIp(req);
  const rl = rateLimit(`mfa-recover:${user.id}:${ip}`, 5, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  const token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
  if (!computeMfaState(user, token).enrolled) {
    return NextResponse.json({ error: 'No authenticator is set up for this account.' }, { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Backup codes are not available on this server. Contact an administrator.' },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === 'string' ? normalizeBackupCode(body.code) : '';
  if (code.length !== 10) {
    return NextResponse.json({ error: 'Backup codes look like XXXXX-XXXXX.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('mfa_backup_codes')
    .select('id, code_hash')
    .eq('user_id', user.id)
    .is('used_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const wanted = hashBackupCode(user.id, code);
  const match = (rows ?? []).find((r) => hashesEqual(r.code_hash as string, wanted));

  const audit = {
    entity: 'auth_user',
    entity_id: user.id,
    actor_user_id: user.id,
    ip_address: req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
  };

  if (!match) {
    await writeAudit({ ...audit, action: 'mfa.recover.failed' });
    return NextResponse.json({ error: 'That backup code is wrong or already used.' }, { status: 400 });
  }

  // Burn the code atomically: only succeed if it is still unused, so two
  // concurrent requests can't both spend it.
  const burn = await admin
    .from('mfa_backup_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', match.id)
    .is('used_at', null)
    .select('id');
  if (burn.error || !burn.data?.length) {
    return NextResponse.json({ error: 'That backup code is wrong or already used.' }, { status: 400 });
  }

  const { data: factors, error: listErr } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  for (const f of factors?.factors ?? []) {
    const { error: delErr } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Old codes belonged to the lost authenticator — invalidate the rest.
  await admin.from('mfa_backup_codes').delete().eq('user_id', user.id);

  await writeAudit({ ...audit, action: 'mfa.recover.used_backup_code' });
  return NextResponse.json({ ok: true });
}
