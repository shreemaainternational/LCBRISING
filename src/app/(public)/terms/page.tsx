import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using the Lions Club of Baroda Rising Star website.',
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        pillText="Legal · Terms"
        headline="Terms of"
        accent="Service"
        subtitle="The rules for using this website, donating, and participating in club activities."
      />
      <article className="container-page py-16 max-w-3xl">
        <p className="text-gray-600 text-sm">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">1. Acceptance</h2>
        <p className="text-gray-700">
          By using barodarisingstar.com (the &ldquo;Site&rdquo;) you agree to these terms. If you do not agree, please do not use the Site.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">2. About</h2>
        <p className="text-gray-700">
          The Site is operated by the Lions Club of Baroda Rising Star, chartered under District 3232 FI of Lions Clubs International. Vadodara, Gujarat, India.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">3. Donations</h2>
        <p className="text-gray-700">
          All donations are voluntary. Payments are processed via Razorpay, UPI, or PhonePe. Once captured, donations are non-refundable except in cases of clear duplicate transactions or processing error — contact us within 7 days at{' '}
          <a href="mailto:barodarisingstar@gmail.com" className="text-brand-700 underline">barodarisingstar@gmail.com</a>.
        </p>
        <p className="text-gray-700">
          Tax deduction receipts (where applicable) are issued by email after a successful donation.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">4. Account &amp; membership</h2>
        <p className="text-gray-700">
          Members are responsible for keeping their login credentials confidential. Officers managing federation data must follow Lions International&rsquo;s data-handling guidelines.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">5. Acceptable use</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>No unauthorised access, scraping, or reverse engineering.</li>
          <li>No content that is unlawful, abusive, or violates third-party rights.</li>
          <li>No commercial use of member or donor data.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">6. Intellectual property</h2>
        <p className="text-gray-700">
          The Lions International name and logo are trademarks of Lions Clubs International, used by this chapter under charter. Site content (text, photos, design) belongs to the Lions Club of Baroda Rising Star unless otherwise credited.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">7. Disclaimer &amp; liability</h2>
        <p className="text-gray-700">
          The Site is provided &ldquo;as is&rdquo;. We make no warranties about its accuracy or availability. To the maximum extent permitted by law, the club is not liable for indirect or consequential damages arising from use of the Site.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">8. Governing law</h2>
        <p className="text-gray-700">
          These terms are governed by the laws of India. Disputes are subject to the jurisdiction of courts in Vadodara, Gujarat.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">9. Contact</h2>
        <p className="text-gray-700">
          For any question about these terms, email{' '}
          <a href="mailto:barodarisingstar@gmail.com" className="text-brand-700 underline">barodarisingstar@gmail.com</a>{' '}
          or call <a href="tel:+919712299333" className="text-brand-700 underline">+91-9712299333</a>.
        </p>
      </article>
    </>
  );
}
