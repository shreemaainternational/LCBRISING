import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getAutomationSettings, AUTOMATION_DEFAULTS } from '@/lib/automation/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guard(): Promise<Response | null> {
  try {
    await requireAdmin();
    return null;
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({ settings: await getAutomationSettings() });
}

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  // Only accept the known boolean flags.
  const row: Record<string, unknown> = { id: 'singleton', updated_at: new Date().toISOString() };
  for (const key of Object.keys(AUTOMATION_DEFAULTS) as (keyof typeof AUTOMATION_DEFAULTS)[]) {
    if (typeof body[key] === 'boolean') row[key] = body[key];
  }
  const db = createAdminClient();
  const { error } = await db.from('automation_settings').upsert(row, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: await getAutomationSettings() });
}
