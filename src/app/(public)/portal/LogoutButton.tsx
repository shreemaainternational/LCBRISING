'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch('/api/portal/logout', { method: 'POST' });
    router.replace('/portal/login');
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="text-xs text-white/70 hover:text-white underline disabled:opacity-50"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
