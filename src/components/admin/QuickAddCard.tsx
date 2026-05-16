'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Loader2, CheckCircle2, AlertCircle, Sparkles,
} from 'lucide-react';
import { PhotoMultiUpload } from './PhotoMultiUpload';

export type FieldType =
  | 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'datetime-local'
  | 'textarea' | 'select' | 'checkbox' | 'photos';

export interface QuickField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: string | number | boolean | string[];
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  /** Layout — half-width column on md+ when set. */
  half?: boolean;
  /** Transform value before submitting (e.g. parseFloat). */
  cast?: 'number' | 'int' | 'boolean';
  /** photos field: storage folder + recommended minimum count. */
  folder?: string;
  minPhotos?: number;
  maxPhotos?: number;
}

export interface QuickAddCardProps {
  /** Entity name shown on the trigger button + heading. */
  title: string;
  /** REST endpoint to POST the form data to. */
  endpoint: string;
  /** Form fields. */
  fields: QuickField[];
  /** Optional sub-line shown beneath the title when expanded. */
  description?: string;
  /** Optional accent color (Tailwind class fragment, e.g. "emerald"). */
  accent?: 'amber' | 'blue' | 'emerald' | 'purple' | 'rose' | 'cyan' | 'navy';
  /** If set, redirect to this URL on success (use {id} for the new row id). */
  redirectTo?: string;
  /** Optional transform applied to the payload right before POST. */
  beforeSubmit?: (payload: Record<string, unknown>) => Record<string, unknown>;
  /** Optional API path used for the response key (defaults to the entity title lowercased). */
  responseKey?: string;
}

const ACCENT: Record<NonNullable<QuickAddCardProps['accent']>, string> = {
  amber:   'border-amber-300 bg-amber-50/40 from-amber-500 to-amber-600',
  blue:    'border-blue-300 bg-blue-50/40 from-blue-500 to-blue-600',
  emerald: 'border-emerald-300 bg-emerald-50/40 from-emerald-500 to-emerald-600',
  purple:  'border-purple-300 bg-purple-50/40 from-purple-500 to-purple-600',
  rose:    'border-rose-300 bg-rose-50/40 from-rose-500 to-rose-600',
  cyan:    'border-cyan-300 bg-cyan-50/40 from-cyan-500 to-cyan-600',
  navy:    'border-blue-900 bg-navy-50/40 from-navy-800 to-navy-900',
};

export function QuickAddCard({
  title, endpoint, fields, description, accent = 'amber',
  redirectTo, beforeSubmit, responseKey,
}: QuickAddCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean | string[]>>(() =>
    Object.fromEntries(fields.map((f) => [
      f.name,
      f.type === 'photos'
        ? ((f.defaultValue as string[] | undefined) ?? [])
        : ((f.defaultValue as string | boolean | undefined) ?? (f.type === 'checkbox' ? false : '')),
    ])),
  );
  const [captions, setCaptions] = useState<Record<string, Record<string, string>>>({});
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const accentClasses = ACCENT[accent];

  function up(name: string, v: string | boolean | string[]) {
    setValues((s) => ({ ...s, [name]: v }));
  }
  function reset() {
    setValues(Object.fromEntries(fields.map((f) => [
      f.name,
      f.type === 'photos'
        ? ((f.defaultValue as string[] | undefined) ?? [])
        : ((f.defaultValue as string | boolean | undefined) ?? (f.type === 'checkbox' ? false : '')),
    ])));
  }

  function submit() {
    setResult(null);
    for (const f of fields) {
      if (f.required) {
        const v = values[f.name];
        if (f.type === 'photos') {
          if (!Array.isArray(v) || v.length === 0) {
            setResult({ ok: false, message: `${f.label} requires at least one photo` });
            return;
          }
        } else if (f.type !== 'checkbox' && !String(v ?? '').trim()) {
          setResult({ ok: false, message: `${f.label} is required` });
          return;
        }
      }
    }
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = values[f.name];
      if (f.type === 'photos') {
        if (Array.isArray(raw) && raw.length) {
          payload[f.name] = raw;
          const fieldCaptions = captions[f.name];
          if (fieldCaptions && Object.keys(fieldCaptions).length) {
            // Single photos field → "photo_captions". Multiple → "<name>_captions".
            const captionKey = f.name === 'photos' ? 'photo_captions' : `${f.name}_captions`;
            payload[captionKey] = fieldCaptions;
          }
        }
        continue;
      }
      if (raw === '' || raw == null) continue;
      if (f.cast === 'number')       payload[f.name] = Number(raw);
      else if (f.cast === 'int')     payload[f.name] = parseInt(String(raw), 10);
      else if (f.cast === 'boolean') payload[f.name] = !!raw;
      else                           payload[f.name] = raw;
    }
    const body = beforeSubmit ? beforeSubmit(payload) : payload;

    start(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, message: j.error ?? `Save failed (${res.status})` });
        return;
      }
      const key = responseKey ?? Object.keys(j).find((k) => k !== 'ok') ?? '';
      const created = (j as Record<string, { id?: string } | undefined>)[key];
      setResult({ ok: true, message: `Saved ${title.toLowerCase()}.` });
      reset();
      if (redirectTo && created?.id) {
        router.push(redirectTo.replace('{id}', created.id));
      } else {
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full md:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r ${accentClasses.split(' ').filter((c) => c.startsWith('from-') || c.startsWith('to-')).join(' ')} text-white text-sm font-semibold shadow-sm hover:shadow-md transition-shadow`}
      >
        <Plus size={16} /> Add {title}
      </button>
    );
  }

  return (
    <div className={`border-2 rounded-xl p-4 mb-4 ${accentClasses.split(' ').filter((c) => c.startsWith('border-') || c.startsWith('bg-')).join(' ')}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-navy-800 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500" />
            Quick add — {title}
          </h3>
          {description && <p className="text-xs text-gray-600 mt-0.5">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setResult(null); }}
          className="w-7 h-7 rounded-full bg-white border text-gray-500 hover:text-gray-800 flex items-center justify-center"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.name} className={
            f.half === false ? 'md:col-span-2' :
            f.type === 'textarea' ? 'md:col-span-2' :
            f.type === 'photos' ? 'md:col-span-2' : ''
          }>
            <FieldRenderer
              field={f}
              value={values[f.name]}
              onChange={(v) => up(f.name, v)}
              onCaptionsChange={(map) => setCaptions((s) => ({ ...s, [f.name]: map }))}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/50">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r ${accentClasses.split(' ').filter((c) => c.startsWith('from-') || c.startsWith('to-')).join(' ')} text-white text-sm font-semibold disabled:opacity-60`}
        >
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
          {pending ? 'Saving…' : `Create ${title}`}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-50"
        >
          Reset
        </button>
        {result?.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 size={14} /> {result.message}
          </span>
        )}
        {result && !result.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle size={14} /> {result.message}
          </span>
        )}
      </div>
    </div>
  );
}

function FieldRenderer({ field, value, onChange, onCaptionsChange }: {
  field: QuickField;
  value: string | boolean | string[] | undefined;
  onChange: (v: string | boolean | string[]) => void;
  onCaptionsChange?: (map: Record<string, string>) => void;
}) {
  const cls = 'w-full px-3 py-2 border rounded-md text-sm bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

  if (field.type === 'photos') {
    return (
      <PhotoMultiUpload
        value={Array.isArray(value) ? value : []}
        onChange={(urls) => onChange(urls)}
        onCaptionsChange={onCaptionsChange}
        folder={field.folder}
        minRecommended={field.minPhotos ?? 6}
        max={field.maxPhotos ?? 20}
        label={field.label}
        hint={field.hint ?? 'Drag-drop or click. Camera capture on mobile.'}
      />
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 py-1.5">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-sm text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </span>
        {field.hint && <span className="text-xs text-gray-500 ml-1">— {field.hint}</span>}
      </label>
    );
  }

  return (
    <label className="block">
      <span className={labelCls}>
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </span>
      {field.type === 'textarea' ? (
        <textarea
          rows={3}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cls}
        />
      ) : field.type === 'select' ? (
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          className={cls}
        />
      )}
      {field.hint && <span className="text-[11px] text-gray-500 mt-0.5 block">{field.hint}</span>}
    </label>
  );
}
