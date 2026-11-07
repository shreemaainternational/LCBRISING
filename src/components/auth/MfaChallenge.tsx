'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, KeyRound, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Second sign-in step: asks for the 6-digit code from the user's
 * authenticator app (Google Authenticator, Authy, 1Password…) and upgrades
 * the Supabase session from aal1 to aal2. A single-use backup code can be
 * used instead; that removes the lost authenticator and sends the user to
 * enrol a new one.
 */
export function MfaChallenge({
  redirectTo,
  email,
}: {
  redirectTo: string;
  email?: string | null;
}) {
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      const totp = data?.totp?.find((f) => f.status === 'verified');
      if (totp) setFactorId(totp.id);
      else setError('No authenticator is set up for this account. Sign out and sign in again.');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === 'totp') {
        if (!factorId) throw new Error('Authenticator not found for this account.');
        const { error } = await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code: code.replace(/\s/g, ''),
        });
        if (error) throw new Error(error.message.toLowerCase().includes('invalid')
          ? 'That code is wrong or expired. Check your authenticator and try again.'
          : error.message);
        // Persist the upgraded (aal2) session cookie server-side, then go.
        await fetch('/api/auth/session/sync', { method: 'POST', credentials: 'include' }).catch(() => null);
        window.location.assign(redirectTo || '/admin');
        return;
      }

      const res = await fetch('/api/auth/mfa/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Backup code not accepted.');
      // The lost factor was removed server-side; refresh so the session no
      // longer lists it, then enrol a new authenticator.
      await supabase.auth.refreshSession();
      window.location.assign('/admin/settings/mfa?recovered=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    window.location.reload();
  }

  const isTotp = mode === 'totp';

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 px-3 py-3">
        {isTotp ? (
          <ShieldCheck size={18} className="text-navy-700 mt-0.5 shrink-0" aria-hidden />
        ) : (
          <KeyRound size={18} className="text-navy-700 mt-0.5 shrink-0" aria-hidden />
        )}
        <p className="text-sm text-navy-800">
          {isTotp
            ? 'Open Google Authenticator (or your authenticator app) and enter the 6-digit code for Rising Star CRM.'
            : 'Enter one of your single-use backup codes. Your current authenticator will be removed and you will set up a new one.'}
          {email && (
            <span className="block text-xs text-gray-500 mt-1 break-all">Signed in as {email}</span>
          )}
        </p>
      </div>

      <div>
        <label htmlFor="mfa-code" className="block text-sm font-semibold text-navy-800 mb-1.5">
          {isTotp ? 'Authentication code' : 'Backup code'}
        </label>
        <input
          ref={inputRef}
          id="mfa-code"
          required
          value={code}
          onChange={(e) =>
            setCode(isTotp ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value.toUpperCase())
          }
          inputMode={isTotp ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          pattern={isTotp ? '\\d{6}' : undefined}
          maxLength={isTotp ? 6 : 16}
          placeholder={isTotp ? '123456' : 'XXXXX-XXXXX'}
          className="w-full h-12 px-3 rounded-lg border border-gray-300 text-center text-lg tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || (isTotp && (code.length !== 6 || !factorId))}
        className="btn-navy w-full h-12 inline-flex items-center justify-center gap-2 rounded-lg text-sm disabled:opacity-60"
      >
        <ShieldCheck size={16} aria-hidden />
        {loading ? 'Verifying…' : 'Verify'}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setMode(isTotp ? 'backup' : 'totp');
            setCode('');
            setError(null);
          }}
          className="text-navy-700 hover:underline"
        >
          {isTotp ? 'Use a backup code' : 'Use authenticator code'}
        </button>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
        >
          <LogOut size={14} aria-hidden /> Sign out
        </button>
      </div>
    </form>
  );
}
