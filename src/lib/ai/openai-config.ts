/**
 * Runtime-overridable OpenAI configuration.
 *
 * Order of precedence:
 *   1. env (OPENAI_API_KEY / OPENAI_MODEL)
 *   2. DB singleton row in `openai_settings`
 *
 * Mirrors src/lib/cron-auth.ts and src/lib/push-config.ts so the admin
 * can paste an API key into /admin/integrations/openai without
 * touching Vercel env vars.
 */
import { env } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/server';

export interface OpenAiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  source: 'env' | 'db';
}

const TTL_MS = 60_000;
let cache: { value: OpenAiConfig | null; expiresAt: number } | null = null;
let inflight: Promise<OpenAiConfig | null> | null = null;

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

function fromEnv(): OpenAiConfig | null {
  if (env.OPENAI_API_KEY) {
    return {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL ?? DEFAULT_MODEL,
      baseUrl: DEFAULT_BASE_URL,
      source: 'env',
    };
  }
  return null;
}

export async function loadOpenAiConfig(force = false): Promise<OpenAiConfig | null> {
  const envCfg = fromEnv();
  if (envCfg) return envCfg;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.value;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const db = createAdminClient();
      const { data } = await db.from('openai_settings')
        .select('api_key, model, base_url, is_active')
        .eq('id', 'singleton').maybeSingle();

      const apiKey = data?.api_key as string | null | undefined;
      const active = data?.is_active as boolean | null | undefined;
      if (apiKey && active !== false) {
        const value: OpenAiConfig = {
          apiKey,
          model: (data?.model as string | null) ?? DEFAULT_MODEL,
          baseUrl: (data?.base_url as string | null) ?? DEFAULT_BASE_URL,
          source: 'db',
        };
        cache = { value, expiresAt: now + TTL_MS };
        return value;
      }
      cache = { value: null, expiresAt: now + TTL_MS };
      return null;
    } catch {
      cache = { value: null, expiresAt: now + TTL_MS };
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function peekOpenAiConfig(): OpenAiConfig | null {
  return cache?.value ?? fromEnv();
}

export function invalidateOpenAiCache(): void {
  cache = null;
  inflight = null;
}

/** True when env or DB has a usable OpenAI key (synchronous, cache-only). */
export function isOpenAiAutoConfigured(): boolean {
  return !!peekOpenAiConfig();
}
