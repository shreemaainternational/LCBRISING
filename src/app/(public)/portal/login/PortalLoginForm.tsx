'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PortalLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/portal/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'failed');
        return;
      }
      setStage('code');
      setInfo(
        json.sent
          ? 'Code sent. Check your WhatsApp.'
          : 'If this number has an invoice on file, a code has been sent.',
      );
    } catch {
      setError('network error');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'failed');
        return;
      }
      router.replace('/portal');
    } catch {
      setError('network error');
    } finally {
      setBusy(false);
    }
  }

  if (stage === 'phone') {
    return (
      <form onSubmit={requestOtp} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">WhatsApp number</label>
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
        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-md bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Send OTP'}
        </button>
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        <p className="text-xs text-gray-500 text-center">
          We only send the code if there&apos;s an invoice on file for this number.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="space-y-3">
      {info && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          {info}
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-600 mb-1">6-digit code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="123456"
          maxLength={6}
          className="w-full h-11 border border-gray-300 rounded-md px-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="w-full h-11 rounded-md bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
      >
        {busy ? 'Verifying…' : 'Verify and sign in'}
      </button>
      <button
        type="button"
        onClick={() => {
          setStage('phone');
          setCode('');
          setError(null);
          setInfo(null);
        }}
        className="w-full text-xs text-gray-500 hover:text-gray-800"
      >
        Use a different number
      </button>
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </form>
  );
}
