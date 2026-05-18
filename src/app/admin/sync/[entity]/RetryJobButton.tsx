'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCw, Loader2 } from 'lucide-react';

export function RetryJobButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending}
      onClick={() => start(async () => {
        await fetch(`/api/sync/queue/${id}/revive`, { method: 'POST' });
        router.refresh();
      })}
      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50">
      {pending ? <Loader2 className="animate-spin" size={11} /> : <RotateCw size={11} />}
      Retry
    </button>
  );
}
