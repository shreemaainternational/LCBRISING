'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const redirectTo = params.get('redirectTo') ?? '/admin';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        // Sign-in succeeded and the browser now holds the session cookie.
        // Before navigating, confirm the SERVER can see that session and
        // resolve a member — otherwise /admin would bounce back here with
        // no explanation. Surface the precise reason instead.
        setNotice('Signed in — checking your access…');
        const probe = await fetch('/api/auth/whoami', { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({ ok: false, reason: 'network' }));

        if (probe.ok) {
          setNotice('Signed in successfully. Taking you to your dashboard…');
          // Full navigation so the middleware/layout read the fresh cookie.
          window.location.assign(redirectTo || '/admin');
          return;
        }

        setNotice(null);
        if (probe.reason === 'no_member') {
          setError(
            `Signed in as ${probe.email ?? email}, but this account isn't linked to a member profile yet, so the CRM can't open. An administrator needs to add this email under Members (or the deployment is missing its Supabase service-role key).`,
          );
        } else if (probe.reason === 'no_server_session') {
          setError(
            'Signed in, but the session did not persist on the server. Allow cookies for this site (disable tracking/ITP blocking) and try again.',
          );
        } else {
          setError('Signed in, but could not verify access. Please try again.');
        }
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // No session means Supabase requires email confirmation first.
      if (!data.session) {
        setNotice(
          'Account created. Please check your email to confirm your address before signing in.',
        );
        setLoading(false);
        return;
      }
      window.location.assign(redirectTo || '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  const fieldWrap = 'relative';
  const iconClass =
    'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none';
  const inputClass =
    'w-full h-12 pl-10 pr-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400';
  const labelClass = 'block text-sm font-semibold text-navy-800 mb-1.5';

  return (
    <>
      <form onSubmit={submit} className="grid gap-4">
        {mode === 'signup' && (
          <div>
            <label className={labelClass} htmlFor="name">
              Full Name
            </label>
            <div className={fieldWrap}>
              <User size={16} className={iconClass} aria-hidden />
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="email">
            Email Address
          </label>
          <div className={fieldWrap}>
            <Mail size={16} className={iconClass} aria-hidden />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <div className={fieldWrap}>
            <Lock size={16} className={iconClass} aria-hidden />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-sm text-navy-800">
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-navy w-full h-12 inline-flex items-center justify-center gap-2 rounded-lg text-sm disabled:opacity-60"
        >
          <LogIn size={16} aria-hidden />
          {loading
            ? 'Please wait…'
            : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="text-sm text-navy-700 mt-5 w-full text-center hover:underline"
      >
        {mode === 'signin'
          ? 'Need an account? Sign up'
          : 'Have an account? Sign in'}
      </button>
    </>
  );
}
