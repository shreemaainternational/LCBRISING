import type { Metadata } from 'next';
import { DonateForm } from './DonateForm';

export const metadata: Metadata = {
  title: 'Donate',
  description: 'Donate to support service projects of Lions Club Baroda Rising Star.',
};

export default function DonatePage() {
  return (
    <section className="container-page py-16 max-w-2xl">
      <h1 className="text-4xl font-bold text-navy-800 mb-2">Donate</h1>
      <p className="text-gray-600 mb-8">
        Your contribution funds eye-camps, food drives, scholarships, and more.
        Donations are processed securely through Razorpay.
      </p>
      <DonateForm />
    </section>
  );
}
