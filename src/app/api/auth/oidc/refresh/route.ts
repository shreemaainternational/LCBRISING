import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/oidc';
import { createAdminClient } from '@/lib/supabase/server';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { subject, provider = 'lions' } = (await req.json().catch(() => ({}))) as {
    subject?: string;
    provider?: string;
  };

  if (!subject) {
    return NextResponse.json({ error: 'missing_subject' }, { status: 400 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'service_role_required' }, { status: 503 });
  }

  const supa = createAdminClient();
  const { data: row, error } = await supa
    .from('oauth_accounts')
    .select('id, refresh_token')
    .eq('provider', provider)
    .eq('subject', subject)
    .maybeSingle();
  if (error || !row?.refresh_token) {
    return NextResponse.json({ error: 'refresh_token_not_found' }, { status: 404 });
  }

  try {
    const tokens = await refreshAccessToken(row.refresh_token);
    const now = new Date();
    const accessExp = tokens.expires_in
      ? new Date(now.getTime() + tokens.expires_in * 1000).toISOString()
      : null;

    await supa
      .from('oauth_accounts')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? row.refresh_token,
        access_token_expires_at: accessExp,
        updated_at: now.toISOString(),
      })
      .eq('id', row.id);

    await writeAudit({
      action: 'oauth.refresh',
      entity: 'oauth_account',
      entity_id: row.id,
      actor_label: 'oidc',
    });

    return NextResponse.json({ ok: true, access_token_expires_at: accessExp });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'refresh_failed';
    return NextResponse.json({ error: 'refresh_failed', message }, { status: 500 });
  }
}
