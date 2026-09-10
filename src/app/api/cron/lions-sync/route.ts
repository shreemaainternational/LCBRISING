import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { runLionsAutoSync } from '@/lib/sync/lions-auto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Lions Portal auto-sync endpoint.
 *
 * GET  — scheduler-driven. Authenticated with the CRON_SECRET (Bearer /
 *        x-cron-secret / ?secret=). Runs the full auto-sync pipeline,
 *        honouring the `lions_auto_sync_enabled` automation toggle. Wire a
 *        scheduler (Vercel Cron / cron-job.org / GitHub Actions) to this
 *        URL — see vercel.json.
 *
 * POST — admin "Run now". Requires the `sync.trigger` permission and forces
 *        a run even when the toggle is off, so an admin can trigger a manual
 *        pull from the UI regardless of the schedule.
 */
export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const summary = await runLionsAutoSync({ trigger: 'cron' });
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST() {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;
  const summary = await runLionsAutoSync({
    trigger: 'manual',
    triggeredBy: actor.member_id ?? null,
    force: true,
  });
  return NextResponse.json({ ok: true, ...summary });
}
