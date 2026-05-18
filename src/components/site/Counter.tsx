'use client';

import { useEffect, useRef, useState } from 'react';
import { formatINR } from '@/lib/utils';

type FormatStyle = 'plain' | 'inr';

/**
 * Animated count-up shown when the element first scrolls into view.
 * Falls back to the final value immediately for users who prefer
 * reduced motion. The formatter is selected by a string discriminator
 * so the prop is serialisable across the server/client boundary.
 */
export function Counter({
  value,
  prefix = '',
  suffix = '',
  durationMs = 1400,
  formatStyle = 'plain',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  formatStyle?: FormatStyle;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let start = 0;

    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    const begin = () => {
      if (prefersReduced) {
        setDisplay(value);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            begin();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);

  const formatted =
    formatStyle === 'inr'
      ? formatINR(Math.round(display))
      : Math.round(display).toLocaleString('en-IN');

  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
