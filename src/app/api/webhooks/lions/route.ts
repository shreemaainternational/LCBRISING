/**
 * Inbound Lions International webhook receiver.
 *
 * Expects an HMAC-SHA256 signature in `X-Lions-Signature` (hex), computed
 * over the raw request body using the shared secret in
 * lions_api_settings.webhook_secret (or env LIONS_WEBHOOK_SECRET).
 *
 * The provider must send a stable `event_id` for idempotency. We persist
 * every event to lions_webhook_events keyed on event_id; a duplicate
 * returns 200 with status: skipped so the sender stops retrying. Member,
 * club and officer change events enqueue a targeted sync_queue job
 * (entity_id + external_id set) so the existing worker handles it.
 */
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto/secret-box';
import { enqueueSync } from '@/lib/sync/queue';
import { writeAudit } from '@/lib/audit';
import { loadLionsApiSettings } from '@/lib/oidc/lions-api-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LionsEvent = {
  event_id?: string;
  id?: string;
  event_type?: string;
  type?: string;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

async function getWebhookSecret(): Promise<string | null> {
  const fromEnv = process.env.LIONS_WEBHOOK_SECRET?.trim();
  if (fromEnv) return fromEnv;
  const settings = await loadLionsApiSettings(true);
  const stored = (settings as { webhook_secret?: string | null } | null)?.webhook_secret ?? null;
  return stored ? decrypt(stored) : null;
}

function verify(signature: string, raw: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(raw, 'utf8').digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get('x-lions-signature') ?? '';
  const secret = await getWebhookSecret();

  if (!secret) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }
  if (!sig || !verify(sig, raw, secret)) {
    await writeAudit({
      action: 'lions.webhook.rejected',
      payload: { reason: 'invalid_signature', signature_present: Boolean(sig) },
    });
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let event: LionsEvent;
  try {
    event = JSON.parse(raw) as LionsEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventId = event.event_id ?? event.id;
  const eventType = event.event_type ?? event.type;
  if (!eventId || !eventType) {
    return NextResponse.json({ error: 'missing_event_id_or_type' }, { status: 400 });
  }

  const supa = createAdminClient();

  // Idempotency: insert ON CONFLICT DO NOTHING and check if we created the row.
  const { data: existing } = await supa
    .from('lions_webhook_events')
    .select('id, status')
    .eq('event_id', eventId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ status: 'skipped', reason: 'duplicate', event_id: eventId });
  }

  const { data: row, error: insertErr } = await supa
    .from('lions_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      signature: sig.slice(0, 200),
      payload: event as unknown as Record<string, unknown>,
      status: 'pending',
    })
    .select('id')
    .single();
  if (insertErr || !row) {
    return NextResponse.json({ error: 'persist_failed', detail: insertErr?.message }, { status: 500 });
  }

  // Route the event into the sync queue.
  let syncLogId: string | null = null;
  let status: 'processed' | 'skipped' | 'failed' = 'processed';
  let processError: string | null = null;
  try {
    const data = (event.data ?? event.payload ?? {}) as Record<string, unknown>;
    const externalId = (data.id ?? data.member_id ?? data.club_id ?? data.officer_id) as string | undefined;

    if (eventType.startsWith('member.')) {
      syncLogId = await enqueueSync({
        source: 'rest_api',
        entity: 'members',
        operation: eventType,
        external_id: externalId ?? null,
        payload: { trigger: 'webhook', event_id: eventId, ...data },
        triggered_by: 'lions_webhook',
        priority: 50,
      });
    } else if (eventType.startsWith('club.officer')) {
      syncLogId = await enqueueSync({
        source: 'rest_api',
        entity: 'officers',
        operation: eventType,
        external_id: externalId ?? null,
        payload: { trigger: 'webhook', event_id: eventId, ...data },
        triggered_by: 'lions_webhook',
        priority: 50,
      });
    } else if (eventType.startsWith('club.')) {
      syncLogId = await enqueueSync({
        source: 'rest_api',
        entity: 'clubs',
        operation: eventType,
        external_id: externalId ?? null,
        payload: { trigger: 'webhook', event_id: eventId, ...data },
        triggered_by: 'lions_webhook',
        priority: 50,
      });
    } else if (eventType.startsWith('activity.') || eventType.startsWith('service.')) {
      syncLogId = await enqueueSync({
        source: 'rest_api',
        entity: 'activities',
        operation: eventType,
        external_id: externalId ?? null,
        payload: { trigger: 'webhook', event_id: eventId, ...data },
        triggered_by: 'lions_webhook',
        priority: 50,
      });
    } else {
      status = 'skipped';
    }
  } catch (e) {
    status = 'failed';
    processError = e instanceof Error ? e.message : String(e);
  }

  await supa
    .from('lions_webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      status,
      error: processError,
      sync_log_id: syncLogId,
    })
    .eq('id', row.id);

  await writeAudit({
    action: 'lions.webhook.received',
    payload: { event_id: eventId, event_type: eventType, status, sync_log_id: syncLogId },
  });

  return NextResponse.json({ status, event_id: eventId, sync_log_id: syncLogId });
}
