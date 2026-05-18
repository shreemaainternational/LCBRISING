'use client';

import { useState } from 'react';

const ENTITIES = [
  'members',
  'clubs',
  'officers',
  'attendance',
  'donations',
  'activities',
  'events',
] as const;
type Entity = typeof ENTITIES[number];

type RunResult = {
  ok: boolean;
  log_id?: string;
  result?: {
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    failures?: { row: number; reason: string }[];
  };
  error?: string;
  message?: string;
};

export default function SyncUploader() {
  const [entity, setEntity] = useState<Entity>('members');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set('entity', entity);
      fd.set('file', file);
      const res = await fetch('/api/sync/csv', { method: 'POST', body: fd });
      const json = (await res.json()) as RunResult;
      setResult(json);
    } catch (err) {
      setResult({ ok: false, error: 'upload_failed', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <label className="text-sm">
          <span className="block mb-1 text-gray-600">Entity</span>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value as Entity)}
            className="rounded-md border border-gray-300 px-3 py-2 bg-white"
          >
            {ENTITIES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>

        <label className="text-sm flex-1 min-w-[240px]">
          <span className="block mb-1 text-gray-600">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-navy-700 file:text-white file:px-3 file:py-2 file:text-sm hover:file:bg-navy-800"
          />
        </label>

        <button
          type="submit"
          disabled={!file || busy}
          className="rounded-md bg-navy-700 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-md border p-4 text-sm ${
            result.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}
        >
          {result.ok && result.result ? (
            <div>
              <div className="font-medium mb-2">
                Imported {result.result.inserted + result.result.updated} of {result.result.total} rows
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>Inserted: <strong>{result.result.inserted}</strong></div>
                <div>Updated: <strong>{result.result.updated}</strong></div>
                <div>Skipped: <strong>{result.result.skipped}</strong></div>
                <div>Failed: <strong>{result.result.failed}</strong></div>
              </div>
              {result.result.failures && result.result.failures.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer">Show {result.result.failures.length} failures</summary>
                  <ul className="mt-2 list-disc list-inside text-xs space-y-1 max-h-40 overflow-auto">
                    {result.result.failures.map((f, i) => (
                      <li key={i}>row {f.row}: {f.reason}</li>
                    ))}
                  </ul>
                </details>
              )}
              {result.log_id && (
                <div className="text-xs text-gray-500 mt-2">log id: {result.log_id}</div>
              )}
            </div>
          ) : (
            <div>
              <div className="font-medium text-red-800">{result.error ?? 'failed'}</div>
              {result.message && <div className="text-xs mt-1">{result.message}</div>}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
