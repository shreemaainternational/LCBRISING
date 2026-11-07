import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { computeMfaState } from '@/lib/mfa';
import { generateBackupCodes, hashBackupCode } from '@/lib/mfa-backup';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function currentSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
  return { user, mfa: computeMfaState(user, token) };
}

/** GET → how many unused backup codes the signed-in user has left. */
export async function GET() {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (s.mfa.needsChallenge) return NextResponse.json({ error: 'mfa_required' }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ remaining: 0, available: false });
  }
  const { count } = await createAdminClient()
    .from('mfa_backup_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', s.user.id)
    .is('used_at', null);
  return NextResponse.json({ remaining: count ?? 0, available: true });
}

/**
 * POST → generate a fresh set of backup codes, invalidating any previous
 * set. Only for a session that has just proven its authenticator (aal2).
 * The plaintext codes are returned exactly once and only hashes are stored.
 */
export async function POST(req: Request) {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!s.mfa.enrolled || s.mfa.aal !== 'aal2') {
    return NextResponse.json(
      { error: 'Set up and verify your authenticator before generating backup codes.' },
      { status: 403 },
    );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Backup codes need SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const codes = generateBackupCodes();

  const del = await admin.from('mfa_backup_codes').delete().eq('user_id', s.user.id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  const ins = await admin.from('mfa_backup_codes').insert(
    codes.map((c) => ({ user_id: s.user.id, code_hash: hashBackupCode(s.user.id, c) })),
  );
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  await writeAudit({
    action: 'mfa.backup_codes.generated',
    entity: 'auth_user',
    entity_id: s.user.id,
    actor_user_id: s.user.id,
    ip_address: req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
    payload: { count: codes.length },
  });

  return NextResponse.json({ codes });
}
