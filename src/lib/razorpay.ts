import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { env } from '@/lib/env';

let _client: Razorpay | null = null;

export function razorpay() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_SECRET) {
    throw new Error('Razorpay credentials are not configured');
  }
  if (!_client) {
    _client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_SECRET,
    });
  }
  return _client;
}

export async function createOrder(params: {
  amount: number;          // INR (whole rupees)
  receipt: string;
  notes?: Record<string, string>;
}) {
  const order = await razorpay().orders.create({
    amount: Math.round(params.amount * 100),  // paise
    currency: 'INR',
    receipt: params.receipt,
    notes: params.notes ?? {},
  });
  return order;
}

export function verifyCheckoutSignature(args: {
  order_id: string;
  payment_id: string;
  signature: string;
}) {
  if (!env.RAZORPAY_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_SECRET)
    .update(`${args.order_id}|${args.payment_id}`)
    .digest('hex');
  return safeEqual(expected, args.signature);
}

export function verifyWebhookSignature(payload: string, signature: string) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
