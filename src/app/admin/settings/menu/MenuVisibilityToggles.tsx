'use client';

import { useState } from 'react';
import { Loader2, Check, ExternalLink } from 'lucide-react';
import { PUBLIC_MENU_ITEMS, type MenuItemKey } from '@/lib/site-menu-config';

export function MenuVisibilityToggles({
  initial,
  unavailable,
}: {
  initial: Record<MenuItemKey, boolean>;
  unavailable: boolean;
}) {
  const [visibility, setVisibility] = useState(initial);
  const [savingKey, setSavingKey] = useState<MenuItemKey | null>(null);
  const [savedKey, setSavedKey] = useState<MenuItemKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: MenuItemKey) {
    const next = !visibility[key];
    setVisibility((v) => ({ ...v, [key]: next }));
    setSavingKey(key);
    setSavedKey(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings/menu', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, is_visible: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'save_failed');
      if (data.visibility) setVisibility(data.visibility);
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
    } catch (err) {
      setVisibility((v) => ({ ...v, [key]: !next }));
      setError(err instanceof Error ? err.message : 'save_failed');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-3">
      {unavailable && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The <code className="bg-amber-100 px-1 rounded">site_menu_items</code> table isn&apos;t applied
          yet. Run migration <code className="bg-amber-100 px-1 rounded">0081_site_menu_items.sql</code>{' '}
          to persist these toggles. Until then the nav uses its built-in defaults.
        </div>
      )}
      {PUBLIC_MENU_ITEMS.map((item) => {
        const on = visibility[item.key];
        return (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="min-w-0">
              <div className="font-medium text-navy-800">{item.label}</div>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600"
              >
                {item.href} <ExternalLink size={11} />
              </a>
            </div>
            <div className="flex items-center gap-2">
              {savedKey === item.key && <Check size={15} className="text-green-600" />}
              {savingKey === item.key && <Loader2 size={15} className="animate-spin text-gray-400" />}
              <span className={`text-xs font-semibold uppercase tracking-wider ${on ? 'text-emerald-600' : 'text-gray-400'}`}>
                {on ? 'Shown' : 'Hidden'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? 'Hide' : 'Unhide'} ${item.label}`}
                disabled={savingKey === item.key}
                onClick={() => toggle(item.key)}
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                  on ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    on ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
