'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setHasSession(Boolean(data.session));
        setReady(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) setHasSession(Boolean(session));
      setReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage('Your password has been updated successfully. You can now sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the password. Request a new reset link and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-blue-700 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-navy-800">Set New Password</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">Choose a new password for your Lions Club CRM account.</p>
        {!ready ? <p className="text-sm text-gray-600">Verifying your reset link…</p> : !hasSession ? (
          <div className="grid gap-4">
            <p role="alert" className="text-sm text-red-600">This reset link is invalid, expired, or already used. Please request a new one.</p>
            <Link href="/forgot-password" className="btn-navy flex h-12 items-center justify-center rounded-lg text-sm">Request New Reset Link</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold text-navy-800" htmlFor="new-password">
              New Password
              <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-lg border border-gray-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-navy-800" htmlFor="confirm-password">
              Confirm New Password
              <input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 rounded-lg border border-gray-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </label>
            {message && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {!message && <button type="submit" disabled={loading} className="btn-navy h-12 w-full rounded-lg text-sm disabled:opacity-60">{loading ? 'Updating…' : 'Update Password'}</button>}
            {message && <Link href="/login" className="btn-navy flex h-12 items-center justify-center rounded-lg text-sm">Go to Sign In</Link>}
          </form>
        )}
        <p className="mt-6 text-center text-sm"><Link href="/login" className="font-medium text-navy-700 hover:underline">Back to Sign In</Link></p>
      </section>
    </main>
  );
}
