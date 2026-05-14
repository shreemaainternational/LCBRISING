'use client';

import { useState } from 'react';
import { Mail, Send, Check } from 'lucide-react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'pending' | 'ok' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState('pending');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source: 'home_signup' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        setErrorMsg(json.error ?? 'Could not subscribe. Please try again.');
        setState('err');
        return;
      }
      setState('ok');
      setEmail('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setState('err');
    }
  }

  return (
    <section className="bg-gray-50 py-16">
      <div className="container-page max-w-3xl mx-auto text-center">
        <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
          Stay Connected
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-3">
          Get our monthly newsletter
        </h2>
        <p className="text-gray-600 mb-8">
          Project updates, upcoming events, and stories from the field —
          straight to your inbox. One email a month, no spam.
        </p>

        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <label className="flex-1 relative">
            <span className="sr-only">Email</span>
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              aria-hidden
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={state === 'pending' || state === 'ok'}
              className="w-full h-11 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100"
            />
          </label>
          <button
            type="submit"
            disabled={state === 'pending' || state === 'ok'}
            className="inline-flex items-center justify-center gap-2 h-11 rounded-md bg-navy-800 hover:bg-navy-900 text-white px-6 text-sm font-semibold disabled:opacity-60"
          >
            {state === 'ok' ? (
              <>
                <Check size={16} aria-hidden /> Subscribed
              </>
            ) : state === 'pending' ? (
              'Sending…'
            ) : (
              <>
                Subscribe <Send size={14} aria-hidden />
              </>
            )}
          </button>
        </form>

        {state === 'ok' && (
          <p className="mt-4 text-sm text-emerald-700">
            Thanks for subscribing — first issue lands at the start of next month.
          </p>
        )}
        {state === 'err' && errorMsg && (
          <p className="mt-4 text-sm text-red-700">{errorMsg}</p>
        )}

        <p className="mt-6 text-xs text-gray-500">
          We never share your email. Unsubscribe link in every issue.
        </p>
      </div>
    </section>
  );
}
