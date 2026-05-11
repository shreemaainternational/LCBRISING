'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NewInvoiceCard() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ pay_url: string; invoice_no: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const payload = {
      customer_name: String(f.get('customer_name') ?? ''),
      customer_email: String(f.get('customer_email') ?? '') || null,
      customer_phone: String(f.get('customer_phone') ?? '') || null,
      amount: Number(f.get('amount') ?? 0),
      description: String(f.get('description') ?? '') || null,
      expires_in_minutes: Number(f.get('expires_in_minutes') ?? 0) || undefined,
    };
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { id?: string; invoice_no?: string; pay_url?: string; error?: string };
      if (!res.ok || !json.pay_url) {
        setError(json.error ?? 'create failed');
        return;
      }
      setCreated({ pay_url: json.pay_url, invoice_no: json.invoice_no! });
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setError('network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Create payment request</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input name="customer_name" placeholder="Customer name *" required />
          <Input name="amount" type="number" min="1" step="0.01" placeholder="Amount (₹) *" required />
          <Input name="customer_phone" placeholder="WhatsApp number (+91...)" />
          <Input name="customer_email" type="email" placeholder="Email" />
          <Input name="description" placeholder="Description" className="md:col-span-2" />
          <Input name="expires_in_minutes" type="number" min="5" placeholder="Expires in minutes (optional)" />
          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-md bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 md:col-span-2"
          >
            {busy ? 'Creating…' : 'Create invoice & generate QR link'}
          </button>
        </form>
        {created && (
          <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
            <div className="font-medium text-green-900">Invoice {created.invoice_no} ready.</div>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs bg-white border rounded px-2 py-1 flex-1 overflow-x-auto">{created.pay_url}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(created.pay_url)}
                className="h-8 px-3 rounded bg-gray-900 text-white text-xs"
              >
                Copy
              </button>
              <a
                href={created.pay_url}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-3 rounded bg-purple-600 text-white text-xs inline-flex items-center"
              >
                Open
              </a>
            </div>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 ${props.className ?? ''}`}
    />
  );
}
