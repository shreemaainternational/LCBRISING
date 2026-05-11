import { LookupForm } from './LookupForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Find your invoice',
  description: 'Look up your invoice with your phone number and invoice ID.',
  robots: { index: false, follow: false },
};

export default function LookupPage() {
  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-[#1a0f3e] via-[#3b1a78] to-[#5b21b6] py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <header className="bg-gradient-to-r from-[#5f259f] to-[#7c3aed] text-white p-6 text-center">
            <div className="text-xs uppercase tracking-widest opacity-80">Self-service</div>
            <h1 className="mt-1 text-2xl font-bold">Find your invoice</h1>
            <p className="mt-1 text-sm opacity-90">
              Enter your phone number and the invoice number you received.
            </p>
          </header>
          <div className="p-6">
            <LookupForm />
          </div>
          <footer className="border-t bg-gray-50 p-4 text-center text-xs text-gray-500">
            Lions Club of Baroda Rising Star · For help, contact us.
          </footer>
        </div>
      </div>
    </div>
  );
}
