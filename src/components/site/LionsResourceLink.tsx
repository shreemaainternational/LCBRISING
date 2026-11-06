import { ExternalLink } from 'lucide-react';

/** A labeled outbound link to a Lions Clubs International resource page. */
export function LionsResourceLink({
  href,
  label,
  className = '',
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-brand-600 ${className}`}
    >
      {label} <ExternalLink size={14} aria-hidden />
    </a>
  );
}
