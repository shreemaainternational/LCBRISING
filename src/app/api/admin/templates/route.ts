import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guardAdmin(): Promise<Response | null> {
  try {
    await requireAdmin();
    return null;
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  const db = createAdminClient();
  const { data, error } = await db
    .from('message_templates')
    .select('id, key, label, channel, subject, body, updated_at')
    .order('label');
  // Table may not be migrated yet — return empty rather than 500.
  if (error) return NextResponse.json({ templates: [], unavailable: true });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.label !== 'string' || typeof body.body !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const db = createAdminClient();
  const key =
    typeof body.key === 'string' && body.key.trim()
      ? body.key.trim()
      : body.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);

  const row = {
    key,
    label: body.label.trim(),
    channel: ['email', 'whatsapp', 'both'].includes(body.channel) ? body.channel : 'both',
    subject: typeof body.subject === 'string' ? body.subject : null,
    body: body.body,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from('message_templates')
    .upsert(row, { onConflict: 'key' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = createAdminClient();
  const { error } = await db.from('message_templates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
