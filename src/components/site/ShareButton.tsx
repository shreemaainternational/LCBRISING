'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Link2, Check, Share2, Mail, MessageCircle, ArrowRight } from 'lucide-react';

/** Small brand glyph — this lucide build has no brand icons, so use letter badges. */
function Badge({ char, bg }: { char: string; bg: string }) {
  return (
    <span className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-[3px] text-white text-[10px] font-bold" style={{ background: bg }}>
      {char}
    </span>
  );
}

function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** The row of share destinations + copy + native share. Reused by the generic
 *  ShareModal and the campaign details modal. */
export function ShareTargets({ title, text, url }: { title: string; text?: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const [absUrl] = useState(() => resolveUrl(url));
  const shareText = text ?? title;
  const enc = encodeURIComponent;

  const targets = [
    { label: 'WhatsApp', node: <MessageCircle size={15} className="text-green-600" />, href: `https://wa.me/?text=${enc(`${shareText} ${absUrl}`)}` },
    { label: 'Facebook', node: <Badge char="f" bg="#1877F2" />, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(absUrl)}` },
    { label: 'X', node: <Badge char="𝕏" bg="#000000" />, href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(absUrl)}` },
    { label: 'LinkedIn', node: <Badge char="in" bg="#0A66C2" />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(absUrl)}` },
    { label: 'Email', node: <Mail size={15} className="text-gray-600" />, href: `mailto:?subject=${enc(title)}&body=${enc(`${shareText}\n\n${absUrl}`)}` },
  ];

  async function copy() {
    try { await navigator.clipboard.writeText(absUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }
  async function nativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title, text: shareText, url: absUrl }); } catch { /* cancelled */ }
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((t) => (
        <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-50">
          {t.node} {t.label}
        </a>
      ))}
      <button type="button" onClick={copy}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-50">
        {copied ? <><Check size={15} className="text-green-600" /> Copied</> : <><Link2 size={15} /> Copy link</>}
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button type="button" onClick={nativeShare}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-50">
          <Share2 size={15} /> More
        </button>
      )}
    </div>
  );
}

type ShareButtonProps = {
  title: string;
  text?: string;
  url: string;
  image?: string | null;
  variant?: 'chip' | 'icon' | 'button';
  label?: string;
  className?: string;
};

export function ShareButton({ title, text, url, image, variant = 'chip', label = 'Share', className }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const onClick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setOpen(true); };

  const trigger =
    variant === 'icon' ? (
      <button type="button" onClick={onClick} aria-label="Share" title="Share"
        className={className ?? 'inline-flex items-center justify-center w-8 h-8 rounded-full border text-gray-500 hover:bg-gray-50'}>
        <Share2 size={15} />
      </button>
    ) : variant === 'button' ? (
      <button type="button" onClick={onClick}
        className={className ?? 'inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-50'}>
        <Share2 size={15} /> {label}
      </button>
    ) : (
      <button type="button" onClick={onClick}
        className={className ?? 'inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-brand-600'}>
        <Share2 size={13} /> {label}
      </button>
    );

  return (
    <>
      {trigger}
      {open && <ShareModal title={title} text={text} url={url} image={image} onClose={() => setOpen(false)} />}
    </>
  );
}

export type ShareModalProps = {
  title: string;
  text?: string;
  url: string;
  image?: string | null;
  /** Small line under the title (e.g. "22 Mar 2026 · Vadodara"). */
  meta?: string;
  /** Optional read-more / view CTA. */
  href?: string;
  hrefLabel?: string;
  onClose: () => void;
};

export function ShareModal({ title, text, url, image, meta, href, hrefLabel, onClose }: ShareModalProps) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = ''; };
  }, [onClose]);

  const external = href ? /^https?:\/\//i.test(href) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {image && (
          <div className="relative aspect-[16/9] bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={title} className="w-full h-full object-cover" />
            <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-gray-700 hover:bg-white flex items-center justify-center shadow"><X size={16} /></button>
          </div>
        )}
        <div className="p-5">
          {!image && (
            <div className="flex justify-end -mt-1 mb-1">
              <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full border text-gray-500 hover:bg-gray-50 flex items-center justify-center"><X size={15} /></button>
            </div>
          )}
          {meta && <div className="text-xs text-brand-600 font-semibold mb-1">{meta}</div>}
          <h3 className="text-xl font-bold text-navy-900">{title}</h3>
          {text && <p className="mt-2 text-sm text-gray-700 leading-relaxed">{text}</p>}

          {href && (
            external ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600">
                {hrefLabel ?? 'Read more'} <ArrowRight size={14} />
              </a>
            ) : (
              <Link href={href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-brand-600">
                {hrefLabel ?? 'Read more'} <ArrowRight size={14} />
              </Link>
            )
          )}

          <p className="mt-4 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Share</p>
          <ShareTargets title={title} text={text} url={url} />
        </div>
      </div>
    </div>
  );
}

/** Wrap any card markup so clicking it opens the details + share modal. */
export function ShareCardTrigger({
  className, children, ...modal
}: Omit<ShareModalProps, 'onClose'> & { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? 'text-left w-full'}>
        {children}
      </button>
      {open && <ShareModal {...modal} onClose={() => setOpen(false)} />}
    </>
  );
}
