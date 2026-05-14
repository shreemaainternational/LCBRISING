import Link from 'next/link';

/**
 * Closing call-to-action — sits as the last homepage section, right
 * above the footer. White background so it reads as a clean "the end,
 * now act" beat after the dark newsletter band.
 */
export function FinalCTA() {
  return (
    <section className="bg-white py-20 md:py-24">
      <div className="container-page text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-navy-800 mb-4">
          Ready to Make a Difference?
        </h2>
        <p className="text-gray-600 mb-8">
          Whether you want to volunteer, donate, or spread the word, there are
          many ways to support our mission.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-md bg-navy-800 hover:bg-navy-900 text-white font-semibold px-6 py-3 text-sm transition-colors"
          >
            Get Involved
          </Link>
          <Link
            href="/donate"
            className="inline-flex items-center rounded-md bg-brand-500 hover:bg-brand-600 text-navy-900 font-semibold px-6 py-3 text-sm transition-colors shadow-sm"
          >
            Support Our Cause
          </Link>
        </div>
      </div>
    </section>
  );
}
