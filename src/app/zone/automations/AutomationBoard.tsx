'use client';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, Zap, CheckCircle2, Save } from 'lucide-react';
import type { AutomationDef, ZoneAutomationChannel } from '@/lib/zone-automation-catalog';

export interface AutomationRow {
  kind: string;
  channel: ZoneAutomationChannel;
  is_active: boolean;
  config: Record<string, unknown>;
  cadence: string;
  last_run_at: string | null;
  last_status: string | null;
}

interface Props {
  catalog: AutomationDef[];
  existing: AutomationRow[];
}

export function AutomationBoard({ catalog, existing }: Props) {
  const initial: Record<string, AutomationRow> = Object.fromEntries(existing.map((r) => [r.kind, r]));
  const [state, setState] = useState<Record<string, AutomationRow>>(initial);
  const [savingKind, setSavingKind] = useState<string | null>(null);
  const [, start] = useTransition();
  const [savedKinds, setSavedKinds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const activeKinds = Object.keys(savedKinds).filter((k) => savedKinds[k]);
    if (activeKinds.length === 0) return;
    const id = setTimeout(() => {
      setSavedKinds((s) => {
        const next: Record<string, boolean> = { ...s };
        for (const k of activeKinds) delete next[k];
        return next;
      });
    }, 4000);
    return () => clearTimeout(id);
  }, [savedKinds]);

  function current(def: AutomationDef): AutomationRow {
    return state[def.kind] ?? {
      kind: def.kind,
      channel: def.defaultChannel,
      is_active: false,
      config: Object.fromEntries((def.configFields ?? []).map((f) => [f.key, f.defaultValue])),
      cadence: def.defaultCadence,
      last_run_at: null, last_status: null,
    };
  }

  function update(def: AutomationDef, patch: Partial<AutomationRow>) {
    setState((s) => ({ ...s, [def.kind]: { ...current(def), ...patch } }));
  }

  function save(def: AutomationDef) {
    const cur = current(def);
    setSavingKind(def.kind);
    start(async () => {
      const res = await fetch('/api/zone/automations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: def.kind,
          channel: cur.channel,
          is_active: cur.is_active,
          config: cur.config,
          cadence: cur.cadence,
        }),
      });
      if (res.ok) setSavedKinds((s) => ({ ...s, [def.kind]: true }));
      setSavingKind(null);
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {catalog.map((def) => {
        const cur = current(def);
        const saved = !!savedKinds[def.kind];
        return (
          <div key={def.kind} className={`bg-white rounded-xl border shadow-sm p-5 ${cur.is_active ? 'border-emerald-300' : ''}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="inline-flex items-center gap-2 font-semibold text-navy-800">
                  <Zap size={14} className={cur.is_active ? 'text-emerald-600' : 'text-gray-400'} />
                  {def.name}
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-snug">{def.description}</p>
              </div>
              <label className="inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" className="sr-only peer"
                  checked={cur.is_active}
                  onChange={(e) => update(def, { is_active: e.target.checked })} />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-emerald-500 transition-colors relative">
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${cur.is_active ? 'translate-x-5' : ''}`} />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              <Field label="Channel">
                <select value={cur.channel} onChange={(e) => update(def, { channel: e.target.value as ZoneAutomationChannel })}
                  className={cls}>
                  {def.channels.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Cadence">
                <input value={cur.cadence ?? ''} onChange={(e) => update(def, { cadence: e.target.value })}
                  className={cls} placeholder="weekly:mon@09:00" />
              </Field>
              {(def.configFields ?? []).map((f) => (
                <Field key={f.key} label={f.label}>
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={String(cur.config?.[f.key] ?? f.defaultValue)}
                    onChange={(e) => update(def, {
                      config: {
                        ...cur.config,
                        [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                      },
                    })}
                    className={cls}
                  />
                  {f.hint && <p className="text-[10px] text-gray-500 mt-1">{f.hint}</p>}
                </Field>
              ))}
            </div>

            <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
              <strong className="text-[10px] uppercase tracking-wider">Preview:</strong>
              <p className="mt-1">{def.preview}</p>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="text-[11px] text-gray-500">
                {cur.last_run_at
                  ? <>Last run: {new Date(cur.last_run_at).toLocaleString('en-IN')} · {cur.last_status ?? 'ok'}</>
                  : <>Never run yet</>}
              </div>
              <div className="inline-flex items-center gap-2">
                {saved && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={11} /> Saved</span>}
                <button type="button" onClick={() => save(def)} disabled={savingKind === def.kind}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold disabled:opacity-60">
                  {savingKind === def.kind ? <Loader2 className="animate-spin" size={11} /> : <Save size={11} />}
                  Save
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const cls = 'w-full px-2 py-1.5 border rounded text-xs';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
