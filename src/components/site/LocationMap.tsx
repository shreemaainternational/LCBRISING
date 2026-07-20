import { ExternalLink } from 'lucide-react';

/**
 * Embedded location map for a free-text place (venue / address / city).
 * Uses Google Maps' keyless embed endpoint — no API key required — with an
 * "Open in Maps" affordance. Mirrors the map already used on /contact.
 */
export function LocationMap({
  location,
  heightClass = 'h-64',
  className,
}: {
  location: string;
  heightClass?: string;
  className?: string;
}) {
  const q = encodeURIComponent(location);
  return (
    <div className={`relative rounded-xl overflow-hidden border border-gray-200 ${className ?? ''}`}>
      <iframe
        title={`Map — ${location}`}
        src={`https://www.google.com/maps?q=${q}&output=embed`}
        className={`w-full ${heightClass} border-0`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white text-navy-700 text-sm font-medium px-3 py-1.5 rounded-md shadow-sm hover:bg-gray-50"
      >
        Open in Maps
        <ExternalLink size={14} aria-hidden />
      </a>
    </div>
  );
}
