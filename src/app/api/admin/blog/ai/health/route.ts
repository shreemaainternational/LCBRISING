import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { integrations, env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: integrations.openai,
    openai_key_set: integrations.openai,
    model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
    service_role_set: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
