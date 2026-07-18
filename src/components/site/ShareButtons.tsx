'use client';

import { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';

/**
 * Share bar for a report page: WhatsApp, Facebook, X, copy-link, and the
 * native OS share sheet (mobile). The absolute URL is read from
 * window.location at click time, so there is no server/client state to sync.
 */
export function ShareButtons({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `${title} — Lions Club of Baroda Rising Star`;
  const enc = encodeURIComponent;
  const currentUrl = () => (typeof window !== 'undefined' ? window.location.href : '');
  const openTab = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

  const shareWhatsApp = () => openTab(`https://wa.me/?text=${enc(`${shareText}\n${currentUrl()}`)}`);
  const shareFacebook = () => openTab(`https://www.facebook.com/sharer/sharer.php?u=${enc(currentUrl())}`);
  const shareX = () => openTab(`https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(currentUrl())}`);

  async function copy() {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: currentUrl() });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  }

  const base =
    'inline-flex items-center justify-center h-10 w-10 rounded-full text-white transition-transform hover:-translate-y-0.5 shadow-sm';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      <span className="text-sm font-semibold text-gray-500 mr-1">Share</span>

      <button type="button" onClick={shareWhatsApp} aria-label="Share on WhatsApp" className={`${base} bg-[#25D366]`}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.893c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a11.95 11.95 0 005.71 1.454h.006c6.585 0 11.946-5.359 11.949-11.945a11.9 11.9 0 00-3.48-8.443Z" />
        </svg>
      </button>

      <button type="button" onClick={shareFacebook} aria-label="Share on Facebook" className={`${base} bg-[#1877F2]`}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
        </svg>
      </button>

      <button type="button" onClick={shareX} aria-label="Share on X" className={`${base} bg-black`}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      </button>

      <button type="button" onClick={copy} aria-label="Copy link" className={`${base} bg-gray-600`}>
        {copied ? <Check size={18} /> : <Link2 size={18} />}
      </button>

      <button type="button" onClick={nativeShare} aria-label="More sharing options" className={`${base} bg-navy-800`}>
        <Share2 size={17} />
      </button>
    </div>
  );
}
