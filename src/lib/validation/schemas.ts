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

// =====================================================================
// Social + Creative
// =====================================================================
export const aiGenerateSchema = z.object({
  type: z.enum([
    'social_post','article','press_release','flyer_text','invitation',
    'birthday','video_script','blog_article',
  ]),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(120).optional(),
  language: z.enum(['en','gu','hi']).default('en'),
  platform: z.enum(['facebook','instagram','linkedin','whatsapp','twitter','youtube']).optional(),
  tone: z.enum(['inspirational','formal','friendly','urgent','celebratory']).default('inspirational'),
  extra: z.record(z.unknown()).optional(),
});

export const canvaDesignSchema = z.object({
  template_type: z.enum(['flyer','invitation','birthday','certificate','post','press_release']),
  template_id: z.string().optional(),
  data: z.record(z.unknown()),
  format: z.enum(['png','jpg','pdf','mp4']).default('png'),
  activity_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  member_id: z.string().uuid().optional(),
});

export const socialPostSchema = z.object({
  platforms: z.array(z.enum(['facebook','instagram','linkedin','whatsapp'])).min(1),
  caption: z.string().min(1).max(4000),
  hashtags: z.array(z.string()).max(30).default([]),
  media_urls: z.array(z.string().url()).max(10).default([]),
  scheduled_at: z.string().datetime().optional(),
  creative_id: z.string().uuid().optional(),
  activity_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  donation_id: z.string().uuid().optional(),
});

// =====================================================================
// Accounting
// =====================================================================
export const journalLineSchema = z.object({
  account_id: z.string().uuid().optional(),
  account_code: z.string().optional(),
  debit: z.number().nonnegative().optional(),
  credit: z.number().nonnegative().optional(),
  memo: z.string().optional(),
}).refine((l) => !!(l.account_id || l.account_code), { message: 'account_id or account_code required' })
  .refine((l) => Number(l.debit ?? 0) > 0 ? Number(l.credit ?? 0) === 0 : Number(l.credit ?? 0) > 0,
          { message: 'each line needs exactly one of debit or credit' });

export const postJournalSchema = z.object({
  date: z.string().optional(),
  description: z.string().min(2).max(500),
  reference_type: z.enum(['donation','payment','expense','manual','reversal']).default('manual'),
  reference_id: z.string().optional(),
  lines: z.array(journalLineSchema).min(2).max(50),
});

export const expenseSchema = z.object({
  vendor_id: z.string().uuid().optional(),
  expense_account_id: z.string().uuid(),
  amount: z.number().positive(),
  tax_amount: z.number().nonnegative().default(0),
  category: z.string().optional(),
  description: z.string().optional(),
  expense_date: z.string(),
  bill_url: z.string().url().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d$/).optional(),
  pan: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/).optional(),
  address: z.string().optional(),
});

export const budgetSchema = z.object({
  fiscal_period_id: z.string().uuid(),
  account_id: z.string().uuid(),
  amount: z.number(),
  notes: z.string().optional(),
});

export const videoGenerateSchema = z.object({
  title: z.string().min(2).max(200),
  script: z.string().min(20).max(4000),
  scenes: z.array(z.object({
    text: z.string(),
    image_url: z.string().url().optional(),
    duration_seconds: z.number().min(0.5).max(15).default(3),
  })).min(1).max(20),
  aspect_ratio: z.enum(['9:16','1:1','16:9']).default('9:16'),
  audio_url: z.string().url().optional(),
});
