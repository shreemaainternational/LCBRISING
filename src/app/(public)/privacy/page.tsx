import type { Metadata } from 'next';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Lions Club of Baroda Rising Star collects, uses, and protects your information.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        pillText="Legal · Privacy"
        headline="We respect"
        accent="your privacy"
        subtitle="What we collect, how we use it, and how we keep it safe."
        backgroundImage={PAGE_HERO_BG.privacy}
      />
      <article className="container-page py-16 max-w-3xl prose prose-navy">
        <p className="text-gray-600 text-sm">Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">1. Information we collect</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>Member data</strong> — name, email, phone, club, district, role — collected when you join or are added by an officer.</li>
          <li><strong>Donation data</strong> — name, email, amount, optional PAN — collected when you donate via Razorpay / UPI / PhonePe.</li>
          <li><strong>Payment metadata</strong> — order IDs, transaction status — stored to issue receipts and reconcile.</li>
          <li><strong>Anonymous traffic data</strong> — page view counts (no PII).</li>
        </ul>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">2. How we use it</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>To deliver club services, dues reminders, event invites, and donation receipts.</li>
          <li>To report aggregate activity to District 3232 F1 and Lions Clubs International.</li>
          <li>To improve our website and member experience.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">3. Sharing</h2>
        <p className="text-gray-700">
          We do not sell or rent personal data. We share data only with:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Lions Clubs International / District 3232 F1 — as required for federation reporting.</li>
          <li>Payment processors (Razorpay, PhonePe) — strictly to process donations and dues.</li>
          <li>Communication providers (Resend, Twilio) — to send transactional emails and WhatsApp messages.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">4. Storage &amp; security</h2>
        <p className="text-gray-700">
          Data is stored in Supabase (PostgreSQL) with Row Level Security enabled. All access is HTTPS-only. Service-role credentials are kept server-side; the public-facing app uses anonymous keys gated by RLS.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">5. Your rights</h2>
        <p className="text-gray-700">
          You can request access, correction, or deletion of your personal data by emailing{' '}
          <a href="mailto:barodarisingstar@gmail.com" className="text-brand-700 underline">barodarisingstar@gmail.com</a>.
        </p>

        <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">6. Cookies</h2>
        <p className="text-gray-700">
          We use only session cookies necessary for authentication. No third-party tracking cookies are set.
        </p>
      </article>
    </>
  );
}
