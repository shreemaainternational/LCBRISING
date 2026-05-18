'use client';

import { useState, type ReactElement } from 'react';
import { Link as LinkIcon, Check } from 'lucide-react';

type Target = { label: string; href: string; icon: ReactElement };

function buildTargets(url: string, title: string): Target[] {
  const enc = encodeURIComponent;
  return [
    {
      label: 'Twitter',
      href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
      icon: (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
          <path d="M18.244 2H21l-6.52 7.45L22.5 22h-6.93l-4.83-6.32L4.6 22H1.84l6.97-7.97L1.5 2h7.09l4.36 5.78L18.244 2zm-2.43 18h1.94L7.36 4H5.29l10.524 16z" />
        </svg>
      ),
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      icon: (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
          <path d="M13 22v-8h3l.5-4H13V7.5c0-1.1.3-1.9 2-1.9h2V2.1C16.7 2 15.5 2 14.2 2 11.5 2 9.5 3.7 9.5 6.7V10H7v4h2.5v8h3.5z" />
        </svg>
      ),
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
      icon: (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
          <path d="M6.94 4.5a2.44 2.44 0 11-.01 4.88 2.44 2.44 0 010-4.88zM5 9.75h3.88V21H5V9.75zM10.88 9.75h3.72v1.54h.05c.52-.98 1.78-2.02 3.66-2.02 3.92 0 4.64 2.58 4.64 5.95V21h-3.86v-5.04c0-1.2-.02-2.74-1.67-2.74-1.67 0-1.93 1.3-1.93 2.65V21h-3.86V9.75z" />
        </svg>
      ),
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${enc(`${title}  ${url}`)}`,
      icon: (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
          <path d="M20.52 3.48A11.94 11.94 0 0012.06 0C5.5 0 .14 5.36.14 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.93 11.93 0 005.79 1.47h.01c6.56 0 11.92-5.36 11.92-11.92 0-3.18-1.24-6.17-3.47-8.43zM12.07 21.8h-.01a9.86 9.86 0 01-5.03-1.38l-.36-.21-3.72.97 1-3.62-.24-.37a9.84 9.84 0 01-1.51-5.27c0-5.45 4.43-9.88 9.88-9.88 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 012.9 6.99c0 5.45-4.44 9.87-9.91 9.87zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.93 1.17-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.91-2.18-.24-.57-.48-.49-.66-.5-.17 0-.37-.02-.57-.02s-.51.07-.78.37c-.27.3-1.03 1-1.03 2.45 0 1.45 1.06 2.85 1.21 3.05.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
        </svg>
      ),
    },
  ];
}

export function ShareBar({
  url,
  title,
  className = '',
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const targets = buildTargets(url, title);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs uppercase tracking-wider text-gray-500 mr-1">Share</span>
      {targets.map(({ label, href, icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${label}`}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:text-navy-800 hover:border-navy-800 transition"
        >
          {icon}
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
        aria-label="Copy link"
        className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:text-navy-800 hover:border-navy-800 transition"
      >
        {copied ? <Check size={15} aria-hidden /> : <LinkIcon size={15} aria-hidden />}
      </button>
    </div>
  );
}
