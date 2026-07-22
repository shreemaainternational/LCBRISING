'use client';

import { useState } from 'react';
import { Save, Trash2, Plus, Loader2, Check } from 'lucide-react';

export type Template = {
  id: string;
  key: string;
  label: string;
  channel: string;
  subject: string | null;
  body: string;
};

type Draft = {
  id?: string;
  key: string;
  label: string;
  channel: string;
  subject: string;
  body: string;
};

const EMPTY: Draft = { key: '', label: '', channel: 'both', subject: '', body: '' };

// Setting a template's key to one of these overrides that automated message.
// The Channel field decides whether the override applies to email, WhatsApp,
// or both.
const TRANSACTIONAL_KEYS = [
  'welcome',
  'dues_reminder',
  'donation_receipt',
  'event_reminder',
  'meeting_reminder',
  'officer_appointment',
  'birthday',
  'anniversary',
];

export function TemplatesEditor({ initial }: { initial: Template[] }) {
  const [items, setItems] = useState<Template[]>(initial);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function edit(t: Template) {
    setDraft({ id: t.id, key: t.key, label: t.label, channel: t.channel, subject: t.subject ?? '', body: t.body });
    setSaved(false);
  }

  async function save() {
    if (!draft.label.trim() || !draft.body.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (res.ok && data.template) {
        setItems((prev) => {
          const next = prev.filter((t) => t.id !== data.template.id && t.key !== data.template.key);
          return [...next, data.template].sort((a, b) => a.label.localeCompare(b.label));
        });
        setDraft(EMPTY);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this template?')) return;
    const res = await fetch(`/api/admin/templates?id=${id}`, { method: 'DELETE' });
    if (res.ok) setItems((prev) => prev.filter((t) => t.id !== id));
    if (draft.id === id) setDraft(EMPTY);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* List */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => { setDraft(EMPTY); setSaved(false); }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-navy-900 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          <Plus size={15} /> New template
        </button>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
            No templates yet. Create one to reuse in broadcasts.
          </p>
        ) : (
          items.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${
                draft.id === t.id ? 'border-brand-400 bg-brand-50/40' : 'border-gray-200 bg-white'
              }`}
            >
              <button type="button" onClick={() => edit(t)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-navy-800">{t.label}</span>
                <span className="block truncate text-xs text-gray-500">{t.channel} · {t.key}</span>
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-gray-400 hover:text-red-600"
                aria-label={`Delete ${t.label}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-bold text-navy-800">
          {draft.id ? 'Edit template' : 'New template'}
        </h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Name</span>
              <input
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Thank-you to donor"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Channel</span>
              <select
                value={draft.channel}
                onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="both">Email + WhatsApp</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              Key <span className="font-normal text-gray-400">(optional — leave blank to auto-generate)</span>
            </span>
            <input
              value={draft.key}
              onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
              placeholder="auto"
              list="transactional-keys"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <datalist id="transactional-keys">
              {TRANSACTIONAL_KEYS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            <span className="mt-1 block text-xs text-gray-500">
              Set the key to a transactional slot (<code>welcome</code>, <code>dues_reminder</code>,{' '}
              <code>donation_receipt</code>, <code>event_reminder</code>, <code>meeting_reminder</code>,{' '}
              <code>officer_appointment</code>, <code>birthday</code>, <code>anniversary</code>) to override that automated message. The
              Channel above decides whether it replaces the email, the WhatsApp, or both.
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Subject (email)</span>
            <input
              value={draft.subject}
              onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
              placeholder="Email subject line"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Message</span>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              rows={9}
              placeholder="Use {{name}}, {{event}}, {{date}}, {{location}} as placeholders."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <span className="mt-1 block text-xs text-gray-500">
              Placeholders like <code>{'{{name}}'}</code> are filled in when the message is sent.
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !draft.label.trim() || !draft.body.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-brand-400 disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save template
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                <Check size={13} /> Saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
