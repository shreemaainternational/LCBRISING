import { NextResponse } from 'next/server';
import { processJobs, scheduleDuesReminders } from '@/lib/automation/engine';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Drains the automation_jobs queue. Wire to Vercel Cron with header
 *   Authorization: Bearer ${CRON_SECRET}
 * Suggested schedule: every 5 minutes.
 */
export async function GET(req: Request) {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const url = new URL(req.url);
  const schedule = url.searchParams.get('schedule') === '1';
  if (schedule) await scheduleDuesReminders();
  const results = await processJobs(50);
  return NextResponse.json({ processed: results.length, results });
}

function isAuthorised(req: Request) {
  if (!env.CRON_SECRET) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${env.CRON_SECRET}`;
}
