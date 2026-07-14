import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { drainQueue } from '@/lib/sync/queue';
import '@/lib/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; throw err; }
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit')) || 25));
  const result = await drainQueue(limit, `admin-${Date.now()}`);
  return NextResponse.json({ ok: true, ...result });
}
