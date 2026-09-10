import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { requirePermission, isGuardFailure } from '@/lib/rbac/guard';
import { runEnterpriseAutomation } from '@/lib/automation/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Enterprise AI Automation Conductor endpoint.
 *
 * GET  — scheduler-driven. Authenticated with the CRON_SECRET (Bearer /
 *        x-cron-secret / ?secret=). Runs the orchestrated pipeline,
 *        honouring the `enterprise_automation_enabled` toggle. Pass
 *        `?deep=1` for the full daily pass (includes the Lions Portal
 *        auto-fetch); omit it for a lighter interim pass that only heals,
 *        drains jobs and health-checks. Wire both in vercel.json.
 *
 * POST — admin "Run now". Requires the `sync.trigger` permission and forces
 *        a full deep run even when the toggles are off.
 */
export async function GET(req: Request) {
  if (!(await verifyCronAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const deep = url.searchParams.get('deep') === '1';
  const summary = await runEnterpriseAutomation({ trigger: 'cron', deep });
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST() {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;
  const summary = await runEnterpriseAutomation({
    trigger: 'manual',
    triggeredBy: actor.member_id ?? null,
    deep: true,
    force: true,
  });
  return NextResponse.json({ ok: true, ...summary });
}
