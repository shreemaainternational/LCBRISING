import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requirePermission, isGuardFailure } from '@/lib/rbac';
import { writeAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const Body = z.object({
  kind: z.enum(['oidc', 'rest', 'csv', 'excel', 'webhook', 'whatsapp', 'email', 'sms', 'zoom', 'google', 'microsoft']),
  name: z.string().min(1).max(120),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
  secret_ref: z.string().max(120).optional().nullable(),
  scope_kind: z.enum(['global', 'multiple_district', 'district', 'club']).optional(),
  scope_id: z.string().uuid().optional().nullable(),
});

export async function GET() {
  const actor = await requirePermission('integration.manage');
  if (isGuardFailure(actor)) return actor;
  const supa = await createClient();
  const { data, error } = await supa
    .from('integrations')
    .select('id, kind, name, enabled, config, secret_ref, scope_kind, scope_id, health_status, last_checked_at')
    .order('kind');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integrations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }
  const actor = await requirePermission('integration.manage');
  if (isGuardFailure(actor)) return actor;

  const supa = await createClient();
  const { data, error } = await supa
    .from('integrations')
    .upsert(parsed.data, { onConflict: 'kind,name' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    action: 'integration.upsert',
    entity: 'integration',
    entity_id: data.id,
    actor_user_id: actor.user_id,
    actor_member_id: actor.member_id ?? null,
    payload: { kind: parsed.data.kind, name: parsed.data.name, enabled: parsed.data.enabled },
  });
  return NextResponse.json({ integration: data }, { status: 201 });
}
