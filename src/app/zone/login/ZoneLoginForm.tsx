'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MfaChallenge } from '@/components/auth/MfaChallenge';
import { Loader2, LogIn, AlertCircle } from 'lucide-react';

export function ZoneLoginForm({ redirectTo = '/zone' }: { redirectTo?: string } = {}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [needsMfa, setNeedsMfa] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        // Cookie-backed browser client so the server sees the session.
        const supa = createClient();
        const { error: signErr } = await supa.auth.signInWithPassword({ email, password });
        if (signErr) { setError(signErr.message); return; }

        // Account has an authenticator enrolled → ask for the 6-digit code.
        const { data: aal } = await supa.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
          setNeedsMfa(true);
          return;
        }

        // Persist the session cookie via a server action then redirect.
        const res = await fetch('/api/auth/session/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'SIGNED_IN' }),
          credentials: 'include',
        }).catch(() => null);
        // Fallback — server can still resolve via the supabase-js auth cookies set by signInWithPassword above.
        void res;
        router.push(redirectTo);
      } catch (e) {
        setError(String(e));
      }
    });
  }

  if (needsMfa) return <MfaChallenge redirectTo={redirectTo} email={email} />;

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
