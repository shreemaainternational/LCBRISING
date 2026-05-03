'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

declare global {
  interface Window { Razorpay: new (options: Record<string, unknown>) => { open: () => void } }
}

const PRESETS = [500, 1000, 2500, 5000, 10000];

export function DonateForm() {
  const [amount, setAmount] = useState(1000);
  const [donor, setDonor] = useState({
    name: '', email: '', phone: '', pan: '',
    campaign: 'general', message: '', is_anonymous: false,
  });
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

    try {
      const orderRes = await fetch('/api/donations/intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          donor_name: donor.name,
          donor_email: donor.email || null,
          donor_phone: donor.phone || null,
          donor_pan: donor.pan || null,
          amount,
          campaign: donor.campaign,
          message: donor.message,
          is_anonymous: donor.is_anonymous,
        }),
      });
      if (!orderRes.ok) throw new Error((await orderRes.json()).error ?? 'Failed to start payment');
      const { order, payment_record_id, key_id } = await orderRes.json();

      const rzp = new window.Razorpay({
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: 'Lions Club Baroda Rising Star',
        description: 'Donation',
        prefill: { name: donor.name, email: donor.email, contact: donor.phone },
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
            setError('Payment verification failed. Please contact us if you were charged.');
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
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🙏</div>
          <h2 className="text-2xl font-bold text-navy-800">Thank you!</h2>
          <p className="text-gray-600 mt-2">
            Your donation has been received. Receipt #<strong>{success.receiptNo}</strong>.
            A copy has been emailed to you.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleDonate} className="grid gap-4">
      <Card>
        <CardContent className="p-6">
          <Label className="block mb-2">Choose amount (INR)</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                className={`px-4 py-2 rounded-md border ${amount === p ? 'bg-brand-500 border-brand-500 text-navy-900 font-semibold' : 'border-gray-300'}`}
              >
                ₹{p.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
          <Input type="number" min={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 grid gap-3">
          <div>
            <Label>Full name</Label>
            <Input required value={donor.name} onChange={(e) => setDonor({ ...donor, name: e.target.value })} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={donor.email} onChange={(e) => setDonor({ ...donor, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={donor.phone} onChange={(e) => setDonor({ ...donor, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>PAN (optional, for 80G receipt)</Label>
            <Input value={donor.pan} onChange={(e) => setDonor({ ...donor, pan: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <Label>Message (optional)</Label>
            <Textarea value={donor.message} onChange={(e) => setDonor({ ...donor, message: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={donor.is_anonymous}
              onChange={(e) => setDonor({ ...donor, is_anonymous: e.target.checked })}
            />
            Make my donation anonymous
          </label>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" variant="primary" size="lg" disabled={submitting || !donor.name || amount < 100}>
        {submitting ? 'Processing…' : `Donate ₹${amount.toLocaleString('en-IN')}`}
      </Button>
    </form>
  );
}
