'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  'club_president',
  'club_secretary',
  'club_treasurer',
  'club_officer',
] as const;

export default function AppointForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState<typeof ROLES[number]>('club_president');
  const [termStart, setTermStart] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/crm/clubs/${clubId}/officers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        member_id: memberId,
        role,
        term_start: termStart,
        status: 'active',
        notes: notes || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || body.detail || `HTTP ${res.status}`);
      return;
    }
    setMemberId('');
    setNotes('');
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-5 items-end">
      <label className="text-sm md:col-span-2">
        <span className="block mb-1 text-gray-600">Member ID (UUID)</span>
        <input
          required
          type="text"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </label>
      <label className="text-sm">
        <span className="block mb-1 text-gray-600">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof ROLES[number])}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="block mb-1 text-gray-600">Term start</span>
        <input
          required
          type="date"
          value={termStart}
          onChange={(e) => setTermStart(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-navy-800 hover:bg-navy-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Appointing…' : 'Appoint'}
      </button>
      <label className="text-sm md:col-span-5">
        <span className="block mb-1 text-gray-600">Notes (optional)</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Acting president while X is on leave"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      {error && (
        <p className="md:col-span-5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </form>
  );
}
