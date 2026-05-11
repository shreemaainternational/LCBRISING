import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { runSyncJob, type SyncEntity } from '@/lib/sync';

const Body = z.object({
  source: z.enum(['lions_oidc', 'rest_api', 'csv', 'excel', 'webhook', 'manual']),
  entity: z.enum(['members', 'clubs', 'districts', 'officers', 'attendance', 'awards', 'trainings']),
  integration_id: z.string().uuid().optional(),
  cursor: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const actor = await requirePermission('sync.trigger');
  if (isGuardFailure(actor)) return actor;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', detail: parsed.error.issues }, { status: 400 });
  }

  try {
    const { logId, result } = await runSyncJob({
      source: parsed.data.source,
      entity: parsed.data.entity as SyncEntity,
      integration_id: parsed.data.integration_id ?? null,
      cursor: parsed.data.cursor ?? null,
      payload: parsed.data.payload,
      triggered_by: actor.member_id ?? null,
    });
    return NextResponse.json({ ok: true, log_id: logId, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sync_failed';
    return NextResponse.json({ error: 'sync_failed', message }, { status: 500 });
  }
}
