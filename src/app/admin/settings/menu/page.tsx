import Link from 'next/link';
import { ArrowLeft, Menu as MenuIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/server';
import { defaultMenuVisibility, type MenuItemKey } from '@/lib/site-menu-config';
import { MenuVisibilityToggles } from './MenuVisibilityToggles';

export const dynamic = 'force-dynamic';

async function loadVisibility(): Promise<{ visibility: Record<MenuItemKey, boolean>; unavailable: boolean }> {
  try {
    const db = createAdminClient();
    const { data, error } = await db.from('site_menu_items').select('key, is_visible');
    if (error) return { visibility: defaultMenuVisibility(), unavailable: true };
    const visibility = defaultMenuVisibility();
    for (const row of data ?? []) {
      const key = row.key as MenuItemKey;
      if (key in visibility) visibility[key] = !!row.is_visible;
    }
    return { visibility, unavailable: false };
  } catch {
    return { visibility: defaultMenuVisibility(), unavailable: true };
  }
}

export default async function WebsiteMenuSettingsPage() {
  const { visibility, unavailable } = await loadVisibility();

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/operations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back to Command Center
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1 flex items-center gap-2">
          <MenuIcon className="text-amber-500" />
          Website Menu
        </h1>
        <p className="text-gray-600">
          Hide or unhide any link in the public site&apos;s main navigation. Changes reach
          visitors within about a minute — no code change or redeploy needed.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Main nav links</CardTitle></CardHeader>
        <CardContent>
          <MenuVisibilityToggles initial={visibility} unavailable={unavailable} />
        </CardContent>
      </Card>
    </div>
  );
}
