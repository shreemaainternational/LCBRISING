'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { ShareBar } from '@/components/site/ShareBar';

export type DetailItem = {
  id: string;
  title: string;
  /** Small label above the title (category / outlet / source / type). */
  kicker?: string;
  dateLabel?: string;
  /** Extra meta lines shown as chips (location, time, beneficiaries…). */
  meta?: { icon?: ComponentType<{ size?: number; className?: string }>; text: string }[];
  /** Photo URLs. First is the cover; the rest form a thumbnail strip. */
  photos?: string[];
  /** Rendered HTML body (admin-authored). Takes precedence over `body`. */
  bodyHtml?: string;
  /** Plain-text body; split on blank lines into paragraphs. */
  body?: string;
  /** Highlight figures (beneficiaries, funds raised, progress…). */
  stats?: { label: string; value: string }[];
  /** Call-to-action buttons. */
  ctas?: {
    href: string;
    label: string;
    variant?: 'gold' | 'navy' | 'ghost';
    external?: boolean;
  }[];
  /** Path or URL to share (resolved to absolute at runtime). */
  sharePath: string;
};

const CTA_CLASS: Record<NonNullable<DetailItem['ctas']>[number]['variant'] & string, string> = {
  gold: 'btn-gold',
  navy: 'btn-navy',
  ghost: 'border border-gray-300 text-navy-800 hover:bg-gray-50',
};

function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const cover = photos[active] ?? photos[0];
  return (
    <div className="bg-gray-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt={title} className="w-full max-h-[46vh] object-cover" />
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3 bg-gray-900/95">
          {photos.map((p, i) => (
            <button
              key={`${p}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`h-14 w-20 flex-shrink-0 rounded-md overflow-hidden ring-2 transition ${
                i === active ? 'ring-brand-400' : 'ring-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={`Photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DetailModal({
  item,
  onClose,
}: {
  item: DetailItem | null;
  onClose: () => void;
}) {
  // Esc to close + lock body scroll while open.
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [item, onClose]);

  if (!item) return null;

  const photos = item.photos?.filter(Boolean) ?? [];
  // The modal only renders on client interaction, so window is available.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = origin ? new URL(item.sharePath, origin).toString() : item.sharePath;
  const paragraphs = item.body
    ? item.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center backdrop-blur"
        >
          <X size={18} />
        </button>

        {/* Cover / gallery — keyed by id so its state resets per item */}
        {photos.length > 0 && <Gallery key={item.id} photos={photos} title={item.title} />}

        {/* Body */}
        <div className="p-6 md:p-8">
          {item.kicker && (
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-600 mb-2">
              {item.kicker}
            </p>
          )}
          <h2 className="text-2xl md:text-3xl font-bold text-navy-900 leading-tight">
            {item.title}
          </h2>

          {(item.dateLabel || item.meta?.length) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
              {item.dateLabel && <span>{item.dateLabel}</span>}
              {item.meta?.map((m, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  {m.icon && <m.icon size={14} className="text-brand-500" />}
                  {m.text}
                </span>
              ))}
            </div>
          )}

          {item.stats && item.stats.length > 0 && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {item.stats.map((s) => (
                <div key={s.label} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <div className="text-lg font-bold text-navy-800">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 text-[15px] leading-relaxed text-gray-700">
            {item.bodyHtml ? (
              <div
                className="prose-like"
                // Body is admin-authored / curated content.
                dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
              />
            ) : paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <p key={i} className={i ? 'mt-3' : ''}>
                  {p}
                </p>
              ))
            ) : (
              <p className="text-gray-400 italic">No further details available.</p>
            )}
          </div>

          {item.ctas && item.ctas.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {item.ctas.map((c) => (
                <a
                  key={c.href + c.label}
                  href={c.href}
                  {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={`inline-flex items-center gap-1.5 h-11 px-5 rounded-md text-sm font-semibold ${
                    CTA_CLASS[c.variant ?? 'navy']
                  }`}
                >
                  {c.label}
                  {c.external && <ExternalLink size={14} aria-hidden />}
                </a>
              ))}
            </div>
          )}

          {/* Social sharing */}
          <div className="mt-7 pt-5 border-t border-gray-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2.5">
              Share this
            </p>
            <ShareBar url={shareUrl} title={item.title} />
          </div>
        </div>
      </div>
    </div>
  );
}
