import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { enqueueJob, processJobs } from '@/lib/automation/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manually trigger the weekly officer digest. Enqueues the job and drains
 * the queue immediately so the sender gets instant feedback. Bypasses the
 * weekly guard on purpose (this is an explicit "send now").
 */
export async function POST() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
  await enqueueJob('send_officer_digest', {});
  const results = await processJobs(50);
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    processed: results.length,
    failed: failed.length,
  });
}
