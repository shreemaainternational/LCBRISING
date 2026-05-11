import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalSession } from '@/lib/portal-session';
import { getPrefsForPhone, upsertPrefs } from '@/lib/customer-prefs';

export const runtime = 'nodejs';

const schema = z.object({
  whatsapp_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  reminders_enabled: z.boolean().optional(),
  language: z.enum(['en', 'gu', 'hi']).optional(),
});

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const prefs = await getPrefsForPhone(session.phone);
  return NextResponse.json({ prefs });
}

export async function PATCH(req: Request) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  await upsertPrefs(session.phone, parsed.data);
  return NextResponse.json({ ok: true });
}
