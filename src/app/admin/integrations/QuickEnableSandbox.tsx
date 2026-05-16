'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  /** Which Lions integration to flip. */
  target: 'oidc' | 'api';
}

/**
 * One-click action that posts to the singleton PUT endpoint with
 * sandbox_mode=true. Shows up next to the "Not configured" pill on
 * the integrations health page so an admin never has to leave to
 * make the card green for testing.
 */
export function QuickEnableSandbox({ target }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enable() {
    setError(null);
    start(async () => {
      const endpoint = target === 'oidc' ? '/api/integrations/oidc' : '/api/integrations/lions-api';
      const body: Record<string, unknown> = {
        is_active: true,
        sandbox_mode: true,
        test: false,
      };
      if (target === 'oidc') {
        body.provider_label = 'Lions International (sandbox)';
        body.scopes = 'openid profile email lions.member';
      }
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
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
        <span className="inline-flex items-center gap-1 text-[11px] text-rose-700">
          <AlertCircle size={11} /> {error}
        </span>
      )}
    </div>
  );
}
