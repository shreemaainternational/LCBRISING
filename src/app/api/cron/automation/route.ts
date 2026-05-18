import { NextResponse } from 'next/server';
import { processJobs, scheduleDuesReminders, schedulePaymentReminders, runRecurringInvoices, expireStaleInvoices } from '@/lib/automation/engine';
import { verifyCronAuth } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Drains the automation_jobs queue. Wire to Vercel Cron with header
 *   Authorization: Bearer ${CRON_SECRET}
 * Suggested schedule: every 5 minutes.
 */
export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const url = new URL(req.url);
  const schedule = url.searchParams.get('schedule') === '1';
  let scheduledDues = 0;
  let scheduledInvoices = 0;
  let recurringGenerated = 0;
  let expired = 0;
  if (schedule) {
    scheduledDues = await scheduleDuesReminders();
    scheduledInvoices = await schedulePaymentReminders();
    recurringGenerated = await runRecurringInvoices();
    expired = await expireStaleInvoices();
  }
  const results = await processJobs(50);
  return NextResponse.json({
    scheduled: { dues: scheduledDues, invoices: scheduledInvoices, recurring_generated: recurringGenerated, expired },
    processed: results.length,
    results,
  });
}

