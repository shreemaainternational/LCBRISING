/**
 * Web Push notification helpers.
 *
 * Server-side: sends VAPID-signed notifications via web-push.
 * VAPID keys are resolved at runtime via src/lib/push-config.ts —
 * env vars take precedence, then a singleton row in `push_settings`,
 * and finally a freshly generated keypair on first call.
 *
 * Subscription endpoints persist to `push_subscriptions` (migration 0021).
 */
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/server';
import { loadVapidConfig, peekVapidConfig } from '@/lib/push-config';

let configuredSig: string | null = null;
async function configure(): Promise<boolean> {
  const cfg = await loadVapidConfig();
  if (!cfg) return false;
  const sig = `${cfg.publicKey}|${cfg.subject}`;
  if (configuredSig === sig) return true;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  configuredSig = sig;
  return true;
}

export function isPushConfigured(): boolean {
  return !!peekVapidConfig();
}

export async function isPushConfiguredAsync(): Promise<boolean> {
  return !!(await loadVapidConfig());
}

export function getVapidPublicKey(): string | null {
  return peekVapidConfig()?.publicKey ?? null;
}

export async function getVapidPublicKeyAsync(): Promise<string | null> {
  return (await loadVapidConfig())?.publicKey ?? null;
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
  const ready = await configure();
  if (!ready) {
    return { sent: 0, failed: subs.length, invalidated: 0, errors: subs.map((s) => ({ endpoint: s.endpoint, error: 'web_push_not_configured' })) };
  }
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

export async function broadcastPush(payload: PushNotificationPayload): Promise<SendResult> {
  const db = createAdminClient();
  const { data } = await db.from('push_subscriptions').select('*').eq('is_active', true);
  return sendPushToSubscriptions((data ?? []) as SubscriptionRow[], payload);
}

export async function broadcastToTopic(topic: string, payload: PushNotificationPayload): Promise<SendResult> {
  const db = createAdminClient();
  const { data } = await db.from('push_subscriptions').select('*')
    .eq('is_active', true).contains('topics', [topic]);
  return sendPushToSubscriptions((data ?? []) as SubscriptionRow[], payload);
}

export async function pushToMember(memberId: string, payload: PushNotificationPayload): Promise<SendResult> {
  const db = createAdminClient();
  const { data } = await db.from('push_subscriptions').select('*')
    .eq('is_active', true).eq('member_id', memberId);
  return sendPushToSubscriptions((data ?? []) as SubscriptionRow[], payload);
}
