'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const supabase = createClient();
      const redirectTo = new URL('/reset-password', window.location.origin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (resetError) throw resetError;
      setMessage('If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-blue-700 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-navy-800">Forgot Password?</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">Enter the email address registered with your Lions Club CRM account. We’ll email you a secure reset link.</p>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold text-navy-800" htmlFor="reset-email">
            Email Address
            <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-lg border border-gray-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </label>
          {message && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-navy h-12 w-full rounded-lg text-sm disabled:opacity-60">{loading ? 'Sending…' : 'Send Reset Link'}</button>
        </form>
        <p className="mt-6 text-center text-sm"><Link href="/login" className="font-medium text-navy-700 hover:underline">Back to Sign In</Link></p>
      </section>
    </main>
  );
}
