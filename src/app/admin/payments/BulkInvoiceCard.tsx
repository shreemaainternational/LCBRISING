'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Preview = {
  row: number;
  ok: boolean;
  data?: { customer_name: string; amount: number; customer_phone?: string | null; customer_email?: string | null };
  error?: string;
};

type CreateResult = {
  created_count: number;
  failed_count: number;
  created: { row: number; invoice_no: string; pay_url: string; sent: Record<string, boolean> }[];
  failed: { row: number; error: string }[];
};

const SAMPLE_CSV =
  'customer_name,customer_phone,customer_email,amount,description\n' +
  'Ramesh Patel,+919876543210,ramesh@example.com,5000,Sponsorship pledge\n' +
  'Priya Sharma,+919812345678,,2500,Event ticket\n';

export function BulkInvoiceCard() {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [send, setSend] = useState<{ whatsapp: boolean; email: boolean }>({ whatsapp: false, email: false });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: 'preview' | 'create') {
    setBusy(true);
    setError(null);
    if (action === 'create') setResult(null);
    if (action === 'preview') setPreview(null);
    try {
      const res = await fetch('/api/invoices/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          csv,
          dry_run: action === 'preview',
          send: action === 'create'
            ? [send.whatsapp ? 'whatsapp' : null, send.email ? 'email' : null].filter(Boolean)
            : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'request failed');
        return;
      }
      if (action === 'preview') {
        setPreview(json.rows as Preview[]);
      } else {
        setResult(json as CreateResult);
        router.refresh();
      }
    } catch {
      setError('network error');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsv(await f.text());
  }

  return (
    <Card>
      <CardHeader><CardTitle>Bulk invoices (CSV)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-600">
          Columns: <code>customer_name, customer_phone, customer_email, amount, description, due_date</code>.
          The first row is the header.
        </p>
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
          <button
            type="button"
            onClick={() => setCsv(SAMPLE_CSV)}
            className="text-xs text-purple-700 hover:underline"
          >
            Use sample
          </button>
        </div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={6}
          placeholder="Paste CSV here, or upload a file above"
          className="w-full text-xs font-mono border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={send.whatsapp} onChange={(e) => setSend({ ...send, whatsapp: e.target.checked })} />
            Send WhatsApp
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={send.email} onChange={(e) => setSend({ ...send, email: e.target.checked })} />
            Send email
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || !csv.trim()}
            onClick={() => call('preview')}
            className="h-10 px-4 rounded-md border border-gray-300 text-sm font-medium disabled:opacity-60"
          >
            {busy ? 'Working…' : 'Preview'}
          </button>
          <button
            type="button"
            disabled={busy || !csv.trim()}
            onClick={() => call('create')}
            className="h-10 px-4 rounded-md bg-purple-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-purple-700"
          >
            {busy ? 'Working…' : 'Create invoices'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}

        {preview && (
          <div className="border rounded-md overflow-hidden">
            <div className="text-xs px-3 py-2 bg-gray-50 border-b">Preview · {preview.length} row(s)</div>
            <table className="w-full text-xs">
              <tbody>
                {preview.map((p) => (
                  <tr key={p.row} className={p.ok ? 'border-t' : 'border-t bg-red-50'}>
                    <td className="px-3 py-1 text-gray-500 w-10">#{p.row}</td>
                    <td className="px-3 py-1">
                      {p.ok && p.data ? (
                        <>
                          <strong>{p.data.customer_name}</strong> · ₹{p.data.amount}
                          <span className="text-gray-500 ml-2">{p.data.customer_phone ?? p.data.customer_email ?? ''}</span>
                        </>
                      ) : (
                        <span className="text-red-700">{p.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="border rounded-md p-3 bg-green-50 text-xs">
            <strong>{result.created_count}</strong> invoices created
            {result.failed_count > 0 && (
              <span className="text-red-700"> · {result.failed_count} failed</span>
            )}
            {result.created.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-gray-700">View pay links</summary>
                <ul className="mt-2 space-y-1">
                  {result.created.map((c) => (
                    <li key={c.invoice_no} className="font-mono break-all">
                      <a href={c.pay_url} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline">
                        {c.invoice_no}
                      </a>
                      {c.sent.whatsapp !== undefined && <span className="ml-2">WA:{c.sent.whatsapp ? '✓' : '✗'}</span>}
                      {c.sent.email !== undefined && <span className="ml-2">Email:{c.sent.email ? '✓' : '✗'}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {result.failed.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-700">Failures</summary>
                <ul className="mt-2 space-y-1">
                  {result.failed.map((f) => (
                    <li key={f.row}>#{f.row}: {f.error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
