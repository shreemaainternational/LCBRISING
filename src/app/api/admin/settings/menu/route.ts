import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { loadMenuVisibility, invalidateMenuVisibilityCache } from '@/lib/site-menu';
import { PUBLIC_MENU_ITEMS } from '@/lib/site-menu-config';
import type { Member } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_KEYS = new Set<string>(PUBLIC_MENU_ITEMS.map((i) => i.key));

async function guard(): Promise<{ member: Member } | { denied: Response }> {
  try {
    return { member: await requireAdmin() };
  } catch (err) {
    if (err instanceof Response) return { denied: err };
    throw err;
  }
}

export async function GET() {
  const gate = await guard();
  if ('denied' in gate) return gate.denied;
  return NextResponse.json({ items: PUBLIC_MENU_ITEMS, visibility: await loadMenuVisibility(true) });
}

/** Body: { key: 'stories', is_visible: false } — toggles one menu item. */
export async function PUT(req: Request) {
  const gate = await guard();
  if ('denied' in gate) return gate.denied;
  const { member } = gate;

  const body = await req.json().catch(() => null);
  const key = body?.key as string | undefined;
  const isVisible = body?.is_visible;
  if (!key || !VALID_KEYS.has(key) || typeof isVisible !== 'boolean') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const def = PUBLIC_MENU_ITEMS.find((i) => i.key === key)!;
  const db = createAdminClient();
  const { error } = await db.from('site_menu_items').upsert({
    key: def.key,
    label: def.label,
    href: def.href,
    is_visible: isVisible,
    updated_by: member.id,
  }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateMenuVisibilityCache();
  return NextResponse.json({ visibility: await loadMenuVisibility(true) });
}
