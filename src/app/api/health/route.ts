import { NextResponse } from 'next/server';
import { integrations } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    integrations,
    note: integrations.supabase
      ? 'Ready'
      : 'Supabase env vars missing — public site renders, payments/auth disabled',
  });
}
