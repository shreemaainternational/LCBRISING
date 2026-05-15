import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireZoneChair } from '@/lib/zone-portal';
import { findAutomation, ZONE_AUTOMATION_CATALOG } from '@/lib/zone-automation-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  kind: z.enum([
    'low_attendance_advisory', 'missing_activity_reminder', 'weekly_meeting_reminder',
    'monthly_report_publish', 'birthday_wishes', 'overdue_dues_nudge',
    'csr_partner_check_in', 'new_member_welcome',
  ]),
  channel: z.enum(['whatsapp', 'email', 'sms', 'push', 'advisory']).optional(),
  is_active: z.boolean().optional(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  cadence: z.string().optional(),
});

export async function GET() {
  const ctx = await requireZoneChair();
  const db = createAdminClient();
  const { data: rows } = await db.from('zone_automations').select('*').eq('zone_id', ctx.zone.id);
  const byKind = new Map(rows?.map((r) => [r.kind, r]) ?? []);
  const merged = ZONE_AUTOMATION_CATALOG.map((def) => {
    const row = byKind.get(def.kind);
    return {
      def,
      state: row ?? {
        zone_id: ctx.zone.id, kind: def.kind, channel: def.defaultChannel,
        is_active: false, config: defaultConfig(def.kind), cadence: def.defaultCadence,
        last_run_at: null, last_status: null,
      },
    };
  });
  return NextResponse.json({ automations: merged });
}

export async function PUT(req: Request) {
  const ctx = await requireZoneChair();
  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const def = findAutomation(parsed.data.kind);
  if (!def) return NextResponse.json({ error: 'unknown_kind' }, { status: 400 });

  const db = createAdminClient();
  const payload = {
    zone_id: ctx.zone.id,
    kind: parsed.data.kind,
    channel: parsed.data.channel ?? def.defaultChannel,
    is_active: parsed.data.is_active ?? false,
    config: parsed.data.config ?? defaultConfig(parsed.data.kind),
    cadence: parsed.data.cadence ?? def.defaultCadence,
    created_by: ctx.member.id,
  };
  const { data, error } = await db.from('zone_automations').upsert(payload, { onConflict: 'zone_id,kind' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ automation: data });
}

function defaultConfig(kind: string): Record<string, unknown> {
  const def = findAutomation(kind as never);
  if (!def?.configFields) return {};
  const out: Record<string, unknown> = {};
  for (const f of def.configFields) out[f.key] = f.defaultValue;
  return out;
}
