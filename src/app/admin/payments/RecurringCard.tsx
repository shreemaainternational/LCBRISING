'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RecurringRow = {
  id: string;
  name: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  amount: number;
  interval: string;
  next_run_at: string;
  end_at: string | null;
  active: boolean;
};

export function RecurringCard() {
  const router = useRouter();
  const [rows, setRows] = useState<RecurringRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/recurring-invoices');
    const json = await res.json();
    setRows(json.rows ?? []);
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/recurring-invoices')
      .then((r) => r.json())
      .then((json) => {
        if (active) setRows(json.rows ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get('name') ?? ''),
      customer_name: String(f.get('customer_name') ?? ''),
      customer_email: String(f.get('customer_email') ?? '') || null,
      customer_phone: String(f.get('customer_phone') ?? '') || null,
      amount: Number(f.get('amount') ?? 0),
      description: String(f.get('description') ?? '') || null,
      interval: String(f.get('interval') ?? 'monthly'),
      next_run_at: String(f.get('next_run_at') ?? ''),
      end_at: String(f.get('end_at') ?? '') || null,
    };
    try {
      const res = await fetch('/api/recurring-invoices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'failed'); return; }
      (e.target as HTMLFormElement).reset();
      await load();
      router.refresh();
    } catch {
      setError('network error');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/recurring-invoices/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }
  async function del(id: string) {
    if (!confirm('Delete this recurring template?')) return;
    await fetch(`/api/recurring-invoices/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Recurring invoices ({rows.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <Input name="name" placeholder="Template name *" required />
          <Input name="customer_name" placeholder="Customer name *" required />
          <Input name="customer_phone" placeholder="WhatsApp number" />
          <Input name="customer_email" type="email" placeholder="Email" />
          <Input name="amount" type="number" min="1" step="0.01" placeholder="Amount (₹) *" required />
          <select name="interval" defaultValue="monthly" className="h-10 rounded-md border border-gray-300 px-2 text-sm">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <Input name="next_run_at" type="date" required />
          <Input name="end_at" type="date" placeholder="Optional end date" />
          <Input name="description" placeholder="Description" className="md:col-span-2" />
          <button
            type="submit"
            disabled={busy}
            className="md:col-span-2 h-10 rounded-md bg-purple-600 text-white font-semibold disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add recurring template'}
          </button>
        </form>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {rows.length > 0 && (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-right p-2">Amount</th>
                <th className="text-left p-2">Interval</th>
                <th className="text-left p-2">Next run</th>
                <th className="text-left p-2">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.customer_name}</td>
                  <td className="p-2 text-right">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                  <td className="p-2">{r.interval}</td>
                  <td className="p-2">{r.next_run_at}</td>
                  <td className="p-2">{r.active ? 'active' : 'paused'}</td>
                  <td className="p-2 whitespace-nowrap">
                    <button onClick={() => toggle(r.id, r.active)} className="text-purple-700 hover:underline mr-2">
                      {r.active ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={() => del(r.id)} className="text-red-700 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
