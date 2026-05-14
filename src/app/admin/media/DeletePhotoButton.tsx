'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeletePhotoButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onClick() {
    if (!confirm('Delete this photo? It will be hidden from the public site immediately.')) return;
    const res = await fetch(`/api/admin/photos?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(`Delete failed: ${body.error ?? res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      aria-label="Delete photo"
      onClick={onClick}
      disabled={pending}
      className="text-white hover:text-red-300 transition-colors p-1"
    >
      <Trash2 size={14} />
    </button>
  );
}
