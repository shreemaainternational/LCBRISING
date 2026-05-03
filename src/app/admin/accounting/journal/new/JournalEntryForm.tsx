'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Account { id: string; code: string; name: string; type: string }

interface Line { account_id: string; debit: string; credit: string; memo: string }

const blank: Line = { account_id: '', debit: '', credit: '', memo: '' };

export function JournalEntryForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>([{ ...blank }, { ...blank }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  function update(i: number, patch: Partial<Line>) {
    setLines((cur) => cur.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function addLine() { setLines([...lines, { ...blank }]); }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!balanced) return;
    setBusy(true); setError(null);
    try {
      const payload = {
        date, description,
        reference_type: 'manual',
        lines: lines.filter((l) => l.account_id).map((l) => ({
          account_id: l.account_id,
          debit:  parseFloat(l.debit  || '0') || undefined,
          credit: parseFloat(l.credit || '0') || undefined,
          memo: l.memo || undefined,
        })),
      };
      const res = await fetch('/api/accounting/journals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'failed');
      router.push(`/admin/accounting/journal/${json.journal.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit}>
      <Card className="mb-4">
        <CardContent className="p-6 grid md:grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea required value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Account</th>
                <th className="text-right p-3">Debit</th>
                <th className="text-right p-3">Credit</th>
                <th className="text-left p-3">Memo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <select
                      required
                      value={l.account_id}
                      onChange={(e) => update(i, { account_id: e.target.value })}
                      className="h-9 w-full rounded border border-gray-300 px-2"
                    >
                      <option value="">Select account…</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} · {a.name} ({a.type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.01" min="0" value={l.debit}
                      onChange={(e) => update(i, { debit: e.target.value, credit: '' })} />
                  </td>
                  <td className="p-2">
                    <Input type="number" step="0.01" min="0" value={l.credit}
                      onChange={(e) => update(i, { credit: e.target.value, debit: '' })} />
                  </td>
                  <td className="p-2">
                    <Input value={l.memo} onChange={(e) => update(i, { memo: e.target.value })} />
                  </td>
                  <td className="p-2">
                    {lines.length > 2 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-red-600 text-sm">×</button>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-3 text-right">Totals</td>
                <td className="p-3 text-right">{totalDebit.toFixed(2)}</td>
                <td className="p-3 text-right">{totalCredit.toFixed(2)}</td>
                <td colSpan={2} className={balanced ? 'p-3 text-green-700' : 'p-3 text-red-600'}>
                  {balanced ? '✓ Balanced' : `Off by ${(totalDebit - totalCredit).toFixed(2)}`}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={addLine}>+ Add line</Button>
        <Button type="submit" disabled={!balanced || busy}>
          {busy ? 'Posting…' : 'Post entry'}
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
