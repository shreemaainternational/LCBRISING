import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { reviveDeadJob } from '@/lib/sync/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch (err) { if (err instanceof Response) return err; }
  const { id } = await params;
  const ok = await reviveDeadJob(id);
  return NextResponse.json({ ok });
}
