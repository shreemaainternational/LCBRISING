'use client';

import { useEffect, useState } from 'react';
import { Gift, Repeat, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PRESETS = [500, 1000, 2500, 5000, 10000, 25000];

export function DonateForm() {
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('one-time');
  const [amount, setAmount] = useState(2500);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ receiptNo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document.querySelector('#rzp-script')) return;
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.id = 'rzp-script';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const name = `${firstName} ${lastName}`.trim();

    try {
      const orderRes = await fetch('/api/donations/intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          donor_name: name,
          donor_email: email || null,
          amount,
          campaign: 'general',
          message: frequency === 'monthly' ? 'Monthly giving requested' : '',
        }),
      });
      if (!orderRes.ok)
        throw new Error((await orderRes.json()).error ?? 'Failed to start payment');
      const { order, payment_record_id, key_id } = await orderRes.json();

      const rzp = new window.Razorpay({
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'Lions Club Baroda Rising Star',
        description: frequency === 'monthly' ? 'Monthly Donation' : 'Donation',
        prefill: { name, email },
        theme: { color: '#1e3a8a' },
        handler: async (resp: Record<string, string>) => {
          const verify = await fetch('/api/donations/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              payment_record_id,
            }),
          });
          if (!verify.ok) {
            setError(
              'Payment verification failed. Please contact us if you were charged.',
            );
            return;
          }
          const { receipt_no } = await verify.json();
          setSuccess({ receiptNo: receipt_no });
        },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">🙏</div>
        <h2 className="text-2xl font-bold text-navy-800">Thank you!</h2>
        <p className="text-gray-600 mt-2">
          Your donation has been received. Receipt #
          <strong>{success.receiptNo}</strong>. A copy has been emailed to you.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleDonate}
      className="bg-gray-50 border border-gray-100 rounded-2xl p-8"
    >
      {/* Frequency toggle */}
      <div className="grid grid-cols-2 gap-2 bg-white rounded-lg p-1 border border-gray-200 mb-8">
        <button
          type="button"
          onClick={() => setFrequency('one-time')}
          className={`inline-flex items-center justify-center gap-2 h-11 rounded-md text-sm font-semibold transition-colors ${
            frequency === 'one-time'
              ? 'btn-navy'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Gift size={16} aria-hidden />
          One-Time
        </button>
        <button
          type="button"
          onClick={() => setFrequency('monthly')}
          className={`inline-flex items-center justify-center gap-2 h-11 rounded-md text-sm font-semibold transition-colors ${
            frequency === 'monthly'
              ? 'btn-navy'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Repeat size={16} aria-hidden />
          Monthly
        </button>
      </div>

      {/* Amount */}
      <h3 className="font-bold text-navy-800 mb-3">Select Amount</h3>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(p)}
            className={`h-14 rounded-lg border text-base font-bold transition-colors ${
              amount === p
                ? 'btn-navy border-navy-800'
                : 'bg-white border-gray-300 text-navy-800 hover:border-navy-400'
            }`}
          >
            ₹{p.toLocaleString('en-IN')}
          </button>
        ))}
      </div>

      <h3 className="font-bold text-navy-800 mb-3">Or Enter Custom Amount</h3>
      <div className="relative mb-8">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          ₹
        </span>
        <input
          type="number"
          min={100}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Enter amount"
          className="w-full h-12 pl-8 pr-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Donor info */}
      <h3 className="font-bold text-navy-800 mb-3">Your Information</h3>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <input
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          className="h-12 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <input
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last Name"
          className="h-12 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email Address"
        className="w-full h-12 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 mb-6"
      />

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !firstName || amount < 100}
        className="btn-gold w-full h-14 inline-flex items-center justify-center gap-2 rounded-lg text-base disabled:opacity-60"
      >
        {submitting
          ? 'Processing…'
          : `Donate ₹${amount.toLocaleString('en-IN')}`}
      </button>

      <p className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
        <ShieldCheck size={15} aria-hidden />
        Secure, encrypted payment processing
      </p>
    </form>
  );
}
