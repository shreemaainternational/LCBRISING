import { NextResponse } from 'next/server';
import { clearPortalCookie } from '@/lib/portal-session';

export const runtime = 'nodejs';

export async function POST() {
  await clearPortalCookie();
  return NextResponse.json({ ok: true });
}
