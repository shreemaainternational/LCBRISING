'use client';

import { useState } from 'react';
import { Download, Check } from 'lucide-react';

export type CsvColumn<T> = {
  key: keyof T | string;
  label: string;
  /** Optional value accessor for computed/nested fields. */
  get?: (row: T) => unknown;
};

function cell(value: unknown): string {
  if (value == null) return '';
  const s =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Escape for CSV: wrap in quotes and double any embedded quotes when the
  // value contains a comma, quote, or newline.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Client-side CSV export. Serialises the already-loaded rows to a CSV file
 * and downloads it — no server round-trip, works on every admin list.
 */
export function ExportCsvButton<T extends Record<string, unknown>>({
  rows,
  columns,
  filename,
  label = 'Export CSV',
}: {
  rows: T[];
  columns: CsvColumn<T>[];
  filename: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);

  function download() {
    const header = columns.map((c) => cell(c.label)).join(',');
    const body = rows
      .map((r) =>
        columns
          .map((c) => cell(c.get ? c.get(r) : (r as Record<string, unknown>)[c.key as string]))
          .join(','),
      )
      .join('\n');
    // Prepend a BOM so Excel opens UTF-8 (₹, names) correctly.
    const blob = new Blob([`﻿${header}\n${body}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${filename}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-gray-50 disabled:opacity-50"
      aria-label={`${label} (${rows.length} rows)`}
    >
      {done ? <Check size={14} className="text-green-600" /> : <Download size={14} />}
      {done ? 'Downloaded' : label}
      <span className="text-xs font-normal text-gray-400">({rows.length})</span>
    </button>
  );
}
