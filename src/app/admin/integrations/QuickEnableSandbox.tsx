'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  /** Which Lions integration to flip — both buttons hit the same
   *  unified endpoint that flips OIDC + REST API together, since you
   *  almost always want both in sandbox at the same time. */
  target?: 'oidc' | 'api';
}

/**
 * One-click action that flips both Lions singletons to sandbox.
 *
 * Now backed by a SECURITY DEFINER RPC (migration 0050) so the toggle
 * works even when SUPABASE_SERVICE_ROLE_KEY isn't configured — previously
 * the route bombed with "Invalid API key" on installs without a service
 * role. Falls back to admin client when available.
 */
export function QuickEnableSandbox({ target: _target }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enable() {
    setError(null);
    start(async () => {
      const res = await fetch('/api/integrations/lions/enable-sandbox', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-2 inline-flex flex-col gap-1">
      <button type="button" onClick={enable} disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-60">
        {pending ? <Loader2 className="animate-spin" size={11} /> : <Sparkles size={11} />}
        Enable Sandbox mode
      </button>
      {error && (
        <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 max-w-xs">
          <AlertCircle size={11} className="flex-shrink-0 mt-0.5" /> {error}
        </span>
      )}
    </div>
  );
}
