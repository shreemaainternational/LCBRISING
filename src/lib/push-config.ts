/**
 * Runtime-overridable VAPID configuration for Web Push.
 *
 * Order of precedence:
 *   1. env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)
 *   2. DB singleton row in `push_settings`
 *   3. Lazy-generate a fresh keypair via webpush.generateVAPIDKeys()
 *      and persist it to the DB so this install is self-bootstrapped.
 *
 * Pattern mirrors src/lib/cron-auth.ts.
 */
import webpush from 'web-push';
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
  source: 'env' | 'db' | 'generated';
}

const TTL_MS = 60_000;
let cache: { value: VapidConfig | null; expiresAt: number } | null = null;
let inflight: Promise<VapidConfig | null> | null = null;

const DEFAULT_SUBJECT = 'mailto:admin@lcbaroda.org';

function fromEnv(): VapidConfig | null {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject: env.VAPID_SUBJECT ?? DEFAULT_SUBJECT,
      source: 'env',
    };
  }
  return null;
}

export async function loadVapidConfig(force = false): Promise<VapidConfig | null> {
  const envCfg = fromEnv();
  if (envCfg) return envCfg;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.value;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const db = createAdminClient();
      const { data } = await db.from('push_settings')
        .select('public_key, private_key, subject')
        .eq('id', 'singleton').maybeSingle();

      const pub = data?.public_key as string | null | undefined;
      const priv = data?.private_key as string | null | undefined;
      const subj = (data?.subject as string | null | undefined) ?? DEFAULT_SUBJECT;

      if (pub && priv) {
        const value: VapidConfig = { publicKey: pub, privateKey: priv, subject: subj, source: 'db' };
        cache = { value, expiresAt: now + TTL_MS };
        return value;
      }

      // Lazy-generate on first install.
      const fresh = webpush.generateVAPIDKeys();
      await db.from('push_settings').upsert({
        id: 'singleton',
        public_key: fresh.publicKey,
        private_key: fresh.privateKey,
        subject: subj,
        last_rotated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      const value: VapidConfig = {
        publicKey: fresh.publicKey,
        privateKey: fresh.privateKey,
        subject: subj,
        source: 'generated',
      };
      cache = { value, expiresAt: now + TTL_MS };
      return value;
    } catch {
      cache = { value: null, expiresAt: now + TTL_MS };
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function peekVapidConfig(): VapidConfig | null {
  return cache?.value ?? fromEnv();
}

export function invalidateVapidCache(): void {
  cache = null;
  inflight = null;
}

/** True when env or DB has a usable VAPID keypair (synchronous, cache-only). */
export function isPushAutoConfigured(): boolean {
  return !!peekVapidConfig();
}
