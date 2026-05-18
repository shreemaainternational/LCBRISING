'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky top progress bar that tracks how far the user has scrolled
 * through the article body. The bar is invisible until the user starts
 * reading and disappears again at the end.
 */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const next = max > 0 ? (h.scrollTop / max) * 100 : 0;
      setPct(next);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 inset-x-0 h-1 z-50 bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
