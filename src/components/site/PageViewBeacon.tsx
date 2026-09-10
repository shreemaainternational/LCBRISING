'use client';

import { useEffect } from 'react';

/**
 * Fires a single POST /api/track on mount to bump the public visitor
 * counter. Deduped per browser session via sessionStorage so a user
 * reloading or navigating between public pages only counts once.
 */
export function PageViewBeacon() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem('lcr.visit_tracked') === '1') return;
      sessionStorage.setItem('lcr.visit_tracked', '1');
    } catch {
      // sessionStorage blocked (private mode, etc.) — still attempt one beacon.
    }
    // keepalive lets the request finish if the user navigates away immediately.
    fetch('/api/track', { method: 'POST', keepalive: true }).catch(() => {});
  }, []);
  return null;
}
