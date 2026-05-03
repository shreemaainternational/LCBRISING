import { z } from 'zod';

export const memberSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional().nullable(),
  role: z.enum(['admin', 'president', 'secretary', 'treasurer', 'officer', 'member']).default('member'),
  status: z.enum(['active', 'lapsed', 'suspended', 'pending']).default('pending'),
  club_id: z.string().uuid().optional().nullable(),
});

export const duesSchema = z.object({
  member_id: z.string().uuid(),
  amount: z.number().positive(),
  due_date: z.string(),
  period_label: z.string().optional(),
});

export const donationIntentSchema = z.object({
  donor_name: z.string().min(2).max(120),
  donor_email: z.string().email().optional().nullable(),
  donor_phone: z.string().optional().nullable(),
  donor_pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional().nullable(),
  amount: z.number().int().positive().min(100).max(10_000_000),
  campaign: z.string().max(120).optional().nullable(),
  message: z.string().max(500).optional().nullable(),
  is_anonymous: z.boolean().default(false),
});

export const activitySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  beneficiaries: z.number().int().nonnegative().default(0),
  service_hours: z.number().nonnegative().default(0),
  amount_raised: z.number().nonnegative().default(0),
  date: z.string(),
  location: z.string().optional(),
  photos: z.array(z.string().url()).default([]),
});

export const eventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  date: z.string(),
  end_date: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  is_public: z.boolean().default(true),
  cover_url: z.string().url().optional(),
});

export const rsvpSchema = z.object({
  event_id: z.string().uuid(),
  status: z.enum(['yes', 'no', 'maybe']).default('yes'),
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional(),
});

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  payment_record_id: z.string().uuid(),
});
