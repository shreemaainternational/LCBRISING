import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { DonateForm } from './DonateForm';
import { PageHero, PAGE_HERO_BG } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Donate',
  description:
    'Donate to support service projects of Lions Club Baroda Rising Star.',
  alternates: { canonical: '/donate' },
};

const IMPACT = [
  { amount: '₹500', text: 'Provides a week of nutritious meals for a family of four' },
  { amount: '₹1,000', text: 'Supplies school materials for five students for a semester' },
  { amount: '₹2,500', text: 'Funds a month of after-school tutoring for one student' },
  { amount: '₹5,000', text: 'Covers a full health screening event for 20 community members' },
  { amount: '₹10,000', text: 'Supports emergency housing assistance for one family' },
  { amount: '₹25,000', text: 'Funds a complete job training certification for one person' },
];

const OTHER_WAYS = [
  {
    title: 'Volunteer Your Time',
    body: 'Join our team of dedicated volunteers. Whether you have a few hours or a few days, your time helps deliver eye camps, food drives, and youth programs.',
  },
  {
    title: 'In-Kind Donations',
    body: 'Donate food, clothing, school supplies, or other essential items. Our community needs practical support as much as financial contributions.',
  },
  {
    title: 'Corporate Partnerships',
    body: 'Partner with us for workplace giving, matching gifts, and CSR initiatives that create lasting impact across Vadodara.',
  },
];

export default function DonatePage() {
  return (
    <>
      <PageHero
        headline="Make a Donation"
        subtitle="Your generosity powers everything we do. Every rupee goes directly toward programs that uplift our communities."
        backgroundImage={PAGE_HERO_BG.donate}
      />

      {/* Form + Impact */}
      <section className="container-page py-16 md:py-20">
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-8">
          <DonateForm />

          <div>
            <h2 className="text-2xl font-bold text-navy-800 mb-6">Your Impact</h2>
            <div className="space-y-3">
              {IMPACT.map((i) => (
                <div
                  key={i.amount}
                  className="flex gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4"
                >
                  <CheckCircle2
                    size={20}
                    className="text-green-600 flex-shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-navy-700">{i.amount}</span>{' '}
                    {i.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-blue-50 rounded-2xl p-6">
              <h3 className="font-bold text-navy-800 mb-2">Tax Deductible</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Lions Club of Baroda Rising Star is a registered nonprofit.
                Donations are eligible for tax benefits under Section 80G of the
                Income Tax Act. You will receive a receipt via email for your
                records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other Ways to Give */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy-800 mb-3">
              Other Ways to Give
            </h2>
            <p className="text-gray-600">
              Beyond financial donations, there are many meaningful ways to
              support our mission.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-7">
            {OTHER_WAYS.map((w) => (
              <div
                key={w.title}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7"
              >
                <h3 className="text-lg font-bold text-navy-800 mb-2">
                  {w.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {w.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
