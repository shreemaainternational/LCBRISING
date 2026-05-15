'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';

export function ZoneLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supa = createClient(url, key);
        const { error: signErr } = await supa.auth.signInWithPassword({ email, password });
        if (signErr) { setError(signErr.message); return; }

        // Persist the session cookie via a server action then redirect.
        const res = await fetch('/api/auth/session/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'SIGNED_IN' }),
          credentials: 'include',
        }).catch(() => null);
        // Fallback — server can still resolve via the supabase-js auth cookies set by signInWithPassword above.
        void res;
        router.push('/zone');
      } catch (e) {
        setError(String(e));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="block text-xs font-semibold text-gray-700 mb-1">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 border rounded-md text-sm"
          placeholder="chair@lcbaroda.org"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-gray-700 mb-1">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 border rounded-md text-sm"
          placeholder="••••••••"
        />
      </label>

      {error && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 inline-flex items-start gap-1.5">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm disabled:opacity-60"
      >
        {pending ? <Loader2 className="animate-spin" size={14} /> : <LogIn size={14} />}
        {pending ? 'Signing in…' : 'Sign in to Zone Control'}
      </button>
    </form>
  );
}
