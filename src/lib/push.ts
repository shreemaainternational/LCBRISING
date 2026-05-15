/**
 * Web Push notification helpers.
 *
 * Server-side: sends VAPID-signed notifications via web-push.
 * Subscription/unsubscription endpoints persist to the
 * `push_subscriptions` table (migration 0021).
 *
 * Configure with VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.
 * Generate keys once with: `npx web-push generate-vapid-keys`.
 */
import webpush from 'web-push';
import { env, integrations } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';

let configured = false;
function configure() {
  if (configured) return;
  if (!integrations.webPush) return;
  webpush.setVapidDetails(
    env.VAPID_SUBJECT ?? 'mailto:admin@lcbaroda.org',
    env.VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export function isPushConfigured(): boolean {
  return Boolean(integrations.webPush);
}

export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

export interface PushNotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

export interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  member_id: string | null;
  topics: string[];
  is_active: boolean;
}

export interface SendResult {
  sent: number;
  failed: number;
  invalidated: number;
  errors: { endpoint: string; status?: number; error: string }[];
}

export async function sendPushToSubscriptions(
  subs: SubscriptionRow[],
  payload: PushNotificationPayload,
): Promise<SendResult> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: subs.length, invalidated: 0, errors: subs.map((s) => ({ endpoint: s.endpoint, error: 'web_push_not_configured' })) };
  }
  configure();
  const db = createAdminClient();
  const json = JSON.stringify(payload);
  const result: SendResult = { sent: 0, failed: 0, invalidated: 0, errors: [] };
  const invalid: string[] = [];

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json,
        { TTL: 60 * 60 },
      );
      result.sent++;
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string };
      const status = err.statusCode;
      result.failed++;
      result.errors.push({ endpoint: s.endpoint, status, error: err.message ?? String(e) });
      // 404/410 → endpoint is dead, deactivate it.
      if (status === 404 || status === 410) invalid.push(s.id);
    }
  }));

  if (invalid.length) {
    await db.from('push_subscriptions').update({ is_active: false }).in('id', invalid);
    result.invalidated = invalid.length;
  }

  if (result.sent) {
    const ids = subs.filter((_, i) => i < result.sent).map((s) => s.id);
    if (ids.length) await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).in('id', ids);
  }
  return result;
}

/** Convenience: broadcast a notification to all active subscribers. */
export async function broadcastPush(payload: PushNotificationPayload): Promise<SendResult> {
  const db = createAdminClient();
  const { data } = await db.from('push_subscriptions').select('*').eq('is_active', true);
  return sendPushToSubscriptions((data ?? []) as SubscriptionRow[], payload);
}

/** Broadcast filtered by topic membership (string match). */
export async function broadcastToTopic(topic: string, payload: PushNotificationPayload): Promise<SendResult> {
  const db = createAdminClient();
  const { data } = await db.from('push_subscriptions').select('*')
    .eq('is_active', true).contains('topics', [topic]);
  return sendPushToSubscriptions((data ?? []) as SubscriptionRow[], payload);
}

/** Send to a specific member's devices. */
export async function pushToMember(memberId: string, payload: PushNotificationPayload): Promise<SendResult> {
  const db = createAdminClient();
  const { data } = await db.from('push_subscriptions').select('*')
    .eq('is_active', true).eq('member_id', memberId);
  return sendPushToSubscriptions((data ?? []) as SubscriptionRow[], payload);
}
