/**
 * BrandHeader — the club letterhead shown above the main navigation.
 *
 * Rendered as live HTML/CSS (not a flat image) so the text stays crisp,
 * selectable, translatable and print-friendly, and the office bearers /
 * year can be edited in one place each Lions year (see CLUB below).
 *
 * Logos are served from /public. Drop the two artwork files in there with
 * these exact names (transparent PNG or SVG):
 *   - public/logo-lions.png        Lions International crest (left)
 *   - public/logo-rising-star.png  club "Rising Star" diya emblem (right)
 */

const CLUB = {
  name: 'LIONS CLUB OF BARODA RISING STAR',
  meta: [
    'Club No. 179323',
    'District 3232 F1',
    'Region 6',
    'Zone 1',
  ],
  year: 'Lions Year 2025 – 2026',
  officers: [
    { role: 'Treasurer', name: 'LN Tarun Bhatt' },
    { role: 'Club President', name: 'LN Hiren Rathod' },
    { role: 'Secretary', name: 'LN Paresh Sharma' },
  ],
  logos: {
    lions: { src: '/logo-lions.png', alt: 'Lions Club International emblem' },
    risingStar: {
      src: '/logo-rising-star.png',
      alt: 'Lions Club of Baroda Rising Star — Shine for a Better Tomorrow emblem',
    },
  },
};

export function BrandHeader() {
  return (
    <div
      className="relative isolate overflow-hidden text-white print:bg-white print:text-navy-900"
      style={{
        background:
          'linear-gradient(180deg, var(--color-navy-800) 0%, var(--color-navy-900) 100%)',
      }}
    >
      {/* soft top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -20%, rgba(255,255,255,0.10), transparent 60%)',
        }}
      />

      {/* gold double-border frame */}
      <div className="absolute inset-2 rounded-md border-2 border-brand-400/80" aria-hidden />
      <div className="absolute inset-[10px] rounded-[3px] border border-brand-300/40" aria-hidden />

      <div className="container-page relative">
        <div className="flex items-center gap-3 py-4 sm:gap-6 sm:py-5">
          {/* Left emblem — Lions International */}
          <Emblem {...CLUB.logos.lions} />

          {/* Centre block */}
          <div className="min-w-0 flex-1 text-center">
            <h1 className="font-serif text-base font-bold uppercase leading-tight tracking-wide text-white drop-shadow-sm sm:text-2xl lg:text-3xl">
              {CLUB.name}
            </h1>

            {/* gold divider with star accent */}
            <div className="mx-auto my-1.5 flex max-w-md items-center gap-2 sm:my-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-brand-400/70" />
              <Star className="h-3 w-3 shrink-0 text-brand-400" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-brand-400/70" />
            </div>

            <p className="text-[11px] font-medium text-brand-300 sm:text-sm">
              {CLUB.meta.map((m, i) => (
                <span key={m}>
                  {i > 0 && <span className="mx-1.5 text-brand-400/60">•</span>}
                  {m}
                </span>
              ))}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-brand-200 sm:text-sm">
              {CLUB.year}
            </p>
          </div>

          {/* Right emblem — club Rising Star */}
          <Emblem {...CLUB.logos.risingStar} />
        </div>

        {/* Office bearers */}
        <div className="relative border-t border-brand-400/30 pb-4 pt-3">
          <ul className="mx-auto grid max-w-3xl grid-cols-3 gap-2 text-center sm:gap-6">
            {CLUB.officers.map((o) => (
              <li key={o.role} className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-brand-300 sm:text-xs">
                  {o.role}
                </p>
                <p className="truncate text-xs font-bold text-white underline decoration-brand-400/70 decoration-1 underline-offset-4 sm:text-base">
                  {o.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Emblem({ src, alt }: { src: string; alt: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className="h-14 w-14 shrink-0 object-contain drop-shadow-md sm:h-20 sm:w-20 lg:h-24 lg:w-24"
      loading="eager"
    />
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 7.1-1.01L12 2z" />
    </svg>
  );
}
