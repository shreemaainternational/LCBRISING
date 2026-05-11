'use client';

import { useState } from 'react';

type Result = {
  invoice: {
    id: string;
    invoice_no: string;
    customer_name: string;
    amount: number;
    status: string;
    created_at: string;
  };
  pay_url: string | null;
  invoice_pdf_url: string;
  receipt_pdf_url: string | null;
};

export function LookupForm() {
  const [phone, setPhone] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/invoices/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, invoice_no: invoiceNo }),
      });
      const json = (await res.json()) as Result | { error?: string };
      if (!res.ok || !('invoice' in json)) {
        setError(('error' in json && json.error) || 'Not found');
        return;
      }
      setResult(json);
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
          <div className="text-xs text-purple-700 uppercase tracking-wide">Invoice</div>
          <div className="text-lg font-bold text-gray-900">{result.invoice.invoice_no}</div>
          <div className="text-sm text-gray-700 mt-1">{result.invoice.customer_name}</div>
          <div className="text-sm mt-1">
            ₹{result.invoice.amount.toLocaleString('en-IN')} ·{' '}
            <StatusPill status={result.invoice.status} />
          </div>
        </div>
        <div className="space-y-2">
          {result.pay_url && (
            <a
              href={result.pay_url}
              className="block w-full h-11 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center"
            >
              Pay now
            </a>
          )}
          <a
            href={result.invoice_pdf_url}
            target="_blank"
            rel="noreferrer"
            className="block w-full h-11 rounded-md border border-gray-300 text-gray-800 font-medium text-sm flex items-center justify-center"
          >
            Download invoice (PDF)
          </a>
          {result.receipt_pdf_url && (
            <a
              href={result.receipt_pdf_url}
              target="_blank"
              rel="noreferrer"
              className="block w-full h-11 rounded-md bg-green-600 text-white font-semibold text-sm flex items-center justify-center"
            >
              Download receipt (PDF)
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setPhone('');
            setInvoiceNo('');
          }}
          className="block w-full text-center text-xs text-gray-500 hover:text-gray-800"
        >
          Look up another invoice
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Phone number</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="+91 98765 43210"
          className="w-full h-11 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Invoice number</label>
        <input
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value.toUpperCase())}
          required
          placeholder="INV-260511-123456"
          className="w-full h-11 border border-gray-300 rounded-md px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full h-11 rounded-md bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
      >
        {busy ? 'Searching…' : 'Find invoice'}
      </button>
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </form>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    sent: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-700',
    expired: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-red-100 text-red-700',
    partial: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
