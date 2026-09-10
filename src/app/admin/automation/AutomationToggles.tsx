'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import {
  AUTOMATION_TOGGLES,
  type AutomationSettings,
} from '@/lib/automation/settings-config';

export function AutomationToggles({
  initial,
  unavailable,
}: {
  initial: AutomationSettings;
  unavailable: boolean;
}) {
  const [settings, setSettings] = useState<AutomationSettings>(initial);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  async function toggle(key: keyof AutomationSettings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSavingKey(key);
    setSavedKey(null);
    try {
      const res = await fetch('/api/admin/automation/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      // revert on failure
      setSettings((s) => ({ ...s, [key]: !next[key] }));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-3">
      {unavailable && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The <code className="bg-amber-100 px-1 rounded">automation_settings</code> table isn&apos;t applied
          yet. Run migration <code className="bg-amber-100 px-1 rounded">0066_automation_settings.sql</code>{' '}
          to persist toggles. Until then all automations run with their defaults (on).
        </div>
      )}
      {AUTOMATION_TOGGLES.map((t) => {
        const on = settings[t.key];
        return (
          <div
            key={t.key}
            className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="min-w-0">
              <div className="font-medium text-navy-800">{t.label}</div>
              <div className="text-sm text-gray-500">{t.description}</div>
            </div>
            <div className="flex items-center gap-2">
              {savedKey === t.key && <Check size={15} className="text-green-600" />}
              {savingKey === t.key && <Loader2 size={15} className="animate-spin text-gray-400" />}
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={t.label}
                disabled={savingKey === t.key}
                onClick={() => toggle(t.key)}
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
    </div>
  );
}
