import { NextResponse } from 'next/server';
import { requireZoneChair } from '@/lib/zone-portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stub: notifies the client a sync completed so the banner refreshes. */
export async function POST() {
  await requireZoneChair();
  return NextResponse.json({ ok: true, syncedAt: new Date().toISOString() });
}
