/**
 * Runtime-overridable visibility for the public site's main nav. Every
 * public page renders through this (via PublicNav), so reads are cached
 * in-process for a short TTL — mirrors src/lib/push-config.ts /
 * src/lib/cron-auth.ts. Falls back to defaultMenuVisibility() whenever
 * the table isn't reachable, so the nav never breaks.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { defaultMenuVisibility, type MenuItemKey } from '@/lib/site-menu-config';

export { PUBLIC_MENU_ITEMS, type MenuItemKey, type MenuItemDef } from '@/lib/site-menu-config';

export type MenuVisibility = Record<MenuItemKey, boolean>;

const TTL_MS = 60_000;
let cache: { value: MenuVisibility; expiresAt: number } | null = null;
let inflight: Promise<MenuVisibility> | null = null;

export async function loadMenuVisibility(force = false): Promise<MenuVisibility> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return defaultMenuVisibility();

  const now = Date.now();
  if (!force && cache && cache.expiresAt > now) return cache.value;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const db = createAdminClient();
      const { data, error } = await db.from('site_menu_items').select('key, is_visible');
      if (error) throw error;

      const value = defaultMenuVisibility();
      for (const row of data ?? []) {
        const key = row.key as MenuItemKey;
        if (key in value) value[key] = !!row.is_visible;
      }
      cache = { value, expiresAt: now + TTL_MS };
      return value;
    } catch {
      const value = defaultMenuVisibility();
      cache = { value, expiresAt: now + TTL_MS };
      return value;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Call right after an admin write so every visitor sees the change immediately. */
export function invalidateMenuVisibilityCache(): void {
  cache = null;
  inflight = null;
}

export function isSiteMenuConfigured(): boolean {
  return !!env.SUPABASE_SERVICE_ROLE_KEY;
}
