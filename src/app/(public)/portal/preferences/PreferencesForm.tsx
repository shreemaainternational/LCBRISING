'use client';

import { useState } from 'react';

type Prefs = {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  reminders_enabled: boolean;
  language: string;
};

export function PreferencesForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(next: Prefs) {
    setBusy(true);
    setSaved(false);
    try {
      await fetch('/api/portal/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  function toggle<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    save(next);
  }

  return (
    <div className="space-y-4 text-sm">
      <Toggle
        label="WhatsApp messages"
        description="Pay links, receipts, and confirmations on WhatsApp."
        checked={prefs.whatsapp_enabled}
        onChange={(v) => toggle('whatsapp_enabled', v)}
      />
      <Toggle
        label="Email"
        description="Invoice + receipt PDFs via email."
        checked={prefs.email_enabled}
        onChange={(v) => toggle('email_enabled', v)}
      />
      <Toggle
        label="Payment reminders"
        description="Automatic nudges for unpaid invoices (1, 3, 7, 14, 21 days)."
        checked={prefs.reminders_enabled}
        onChange={(v) => toggle('reminders_enabled', v)}
      />
      <div className="border-t pt-4">
        <label className="block text-xs text-gray-600 mb-1">Language</label>
        <select
          value={prefs.language}
          onChange={(e) => toggle('language', e.target.value)}
          className="h-10 w-full border border-gray-300 rounded-md px-3 text-sm"
        >
          <option value="en">English</option>
          <option value="gu">Gujarati</option>
          <option value="hi">Hindi</option>
        </select>
      </div>
      {(busy || saved) && (
        <p className="text-xs text-center text-gray-500">{busy ? 'Saving…' : 'Saved ✓'}</p>
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <span>
        <span className="block font-medium text-gray-900">{label}</span>
        <span className="block text-xs text-gray-500">{description}</span>
      </span>
    </label>
  );
}
