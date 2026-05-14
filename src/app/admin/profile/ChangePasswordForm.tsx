'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type State = 'idle' | 'pending' | 'done' | 'error';

export function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (next.length < 8) {
      setState('error');
      setMessage('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setState('error');
      setMessage('New password and confirmation do not match.');
      return;
    }

    setState('pending');
    const supabase = createClient();

    // Re-authenticate with the current password before allowing a change.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInError) {
      setState('error');
      setMessage('Current password is incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      setState('error');
      setMessage(error.message);
      return;
    }

    setState('done');
    setMessage('Password updated successfully.');
    setCurrent('');
    setNext('');
    setConfirm('');
  }

  const inputClass =
    'w-full h-11 pl-10 pr-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400';
  const labelClass = 'block text-sm font-semibold text-navy-800 mb-1.5';

  return (
    <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
      <div>
        <label className={labelClass} htmlFor="current">
          Current Password
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            id="current"
            type={show ? 'text' : 'password'}
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="next">
          New Password
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            id="next"
            type={show ? 'text' : 'password'}
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={show ? 'Hide passwords' : 'Show passwords'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="confirm">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            id="confirm"
            type={show ? 'text' : 'password'}
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {message && (
        <p
          className={`text-sm ${
            state === 'done' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'pending'}
        className="btn-navy h-11 inline-flex items-center justify-center rounded-lg text-sm disabled:opacity-60"
      >
        {state === 'pending' ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  );
}
