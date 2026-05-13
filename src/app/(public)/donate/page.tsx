import type { Metadata } from 'next';
import { DonateForm } from './DonateForm';
import { PageHero } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'Donate',
  description: 'Donate to support service projects of Lions Club Baroda Rising Star.',
};

export default function DonatePage() {
  return (
    <>
      <PageHero
        pillText="Lions Club Baroda Rising Star · Donate"
        headline="Your donation"
        accent="changes lives"
        subtitle="Funds eye-camps, food drives, scholarships, disaster relief, and more. Processed securely through Razorpay / UPI / PhonePe."
      />
      <section className="container-page py-16 max-w-2xl">
        <DonateForm />
      </section>
    </>
  );
}
