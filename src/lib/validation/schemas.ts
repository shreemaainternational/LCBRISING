import { z } from 'zod';

export const memberSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional().nullable(),
  role: z.enum(['admin', 'president', 'secretary', 'treasurer', 'officer', 'member']).default('member'),
  status: z.enum(['active', 'lapsed', 'suspended', 'pending']).default('pending'),
  club_id: z.string().uuid().optional().nullable(),
});

export const LIONS_ROLE_VALUES = [
  'international_admin', 'multiple_district_admin', 'district_governor',
  'vice_district_governor', 'cabinet_officer', 'region_chairperson',
  'zone_chairperson', 'club_president', 'club_secretary', 'club_treasurer',
  'club_officer', 'member', 'guest_viewer',
] as const;

export const enterpriseMemberSchema = memberSchema.extend({
  district_id: z.string().uuid().optional().nullable(),
  // Membership number (LCI member ID) is mandatory when adding a member.
  // Updates use enterpriseMemberSchema.partial(), so this stays optional there.
  lions_member_id: z.string().trim().min(1, 'Membership number is required').max(64),
  lions_role: z.enum(LIONS_ROLE_VALUES).optional().nullable(),
  whatsapp: z.string().max(32).optional().nullable(),
  birthday: z.string().optional().nullable(),
});

export const districtSchema = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(200),
  multiple_district_id: z.string().uuid().optional().nullable(),
  governor_name: z.string().max(200).optional().nullable(),
  cabinet_secretary_name: z.string().max(200).optional().nullable(),
  cabinet_treasurer_name: z.string().max(200).optional().nullable(),
  lions_year: z.string().max(16).optional().nullable(),
});

export const clubSchema = z.object({
  name: z.string().min(2).max(200),
  district_id: z.string().uuid().optional().nullable(),
  zone_id: z.string().uuid().optional().nullable(),
  region_id: z.string().uuid().optional().nullable(),
  club_number: z.string().max(64).optional().nullable(),
  district: z.string().optional().default(''),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  country: z.string().max(120).default('India'),
  charter_date: z.string().optional().nullable(),
});

export const officerSchema = z.object({
  member_id: z.string().uuid(),
  scope_kind: z.enum(['club', 'zone', 'region', 'district', 'multiple_district', 'international']),
  scope_id: z.string().uuid().optional().nullable(),
  role: z.enum(LIONS_ROLE_VALUES),
  term_start: z.string(),
  term_end: z.string().optional().nullable(),
  status: z.enum(['active', 'past', 'pending']).default('active'),
  notes: z.string().max(2000).optional().nullable(),
});

export const attendanceSchema = z.object({
  member_id: z.string().uuid(),
  event_id: z.string().uuid().optional().nullable(),
  club_id: z.string().uuid().optional().nullable(),
  occurred_at: z.string().optional(),
  status: z.enum(['present', 'absent', 'excused', 'remote']).default('present'),
  check_in_method: z.string().max(32).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const transferSchema = z.object({
  to_club_id: z.string().uuid(),
  to_district_id: z.string().uuid().optional().nullable(),
  effective_on: z.string().optional(),
  reason: z.string().max(500).optional().nullable(),
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
  method: z.enum(['razorpay', 'phonepe']).default('razorpay'),
});

export const activitySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  beneficiaries: z.number().int().nonnegative().default(0),
  lion_members_count: z.number().int().nonnegative().default(0),
  service_hours: z.number().nonnegative().default(0),
  amount_raised: z.number().nonnegative().default(0),
  date: z.string(),
  location: z.string().optional(),
  photos: z.array(z.string().url()).default([]),
  photo_captions: z.record(z.string(), z.string()).optional(),
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
  category: z.string().max(60).optional(),
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
// Invoices + UPI / PhonePe collection
// =====================================================================
export const invoiceCreateSchema = z.object({
  customer_name: z.string().min(2).max(120),
  customer_email: z.string().email().optional().nullable(),
  customer_phone: z.string().min(7).max(20).optional().nullable(),
  amount: z.number().positive().max(10_000_000),
  currency: z.literal('INR').default('INR'),
  gst_rate: z.number().min(0).max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  due_date: z.string().optional().nullable(),
  expires_in_minutes: z.number().int().min(5).max(60 * 24 * 30).optional(),
  member_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  send_whatsapp: z.boolean().default(false),
  send_email: z.boolean().default(false),
  agent_id: z.string().uuid().optional().nullable(),
  commission_rate: z.number().min(0).max(50).optional().nullable(),
});

export const proofSubmitSchema = z.object({
  invoice_id: z.string().uuid(),
  method: z.enum(['screenshot', 'utr']),
  utr: z.string().min(8).max(40).optional(),
  upi_vpa: z.string().max(80).optional(),
  amount_claimed: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
  screenshot_url: z.string().url().optional(),
  screenshot_hash: z.string().length(64).optional(),
});

export const proofReviewSchema = z.object({
  proof_id: z.string().uuid(),
  decision: z.enum(['verified', 'rejected']),
  rejection_reason: z.string().max(500).optional(),
});

export const refundCreateSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
  utr: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['requested', 'processed']).default('processed'),
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
