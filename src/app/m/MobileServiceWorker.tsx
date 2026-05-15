'use client';
import { useEffect } from 'react';

/** Registers /sw.js when the mobile shell mounts so PWA offline works. */
export function MobileServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW reg failure is non-fatal — app still works online */
    });
  }, []);
  return null;
}
