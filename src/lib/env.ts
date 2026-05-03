import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('Lions Club of Baroda Rising Star'),

  // Supabase is optional at module-load time so the app still builds
  // and serves marketing pages before the project is wired up.
  // Routes that actually call Supabase will throw a clear error if missing.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  CRON_SECRET: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),

  // --- AI ---
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // --- Canva ---
  CANVA_CLIENT_ID: z.string().optional(),
  CANVA_CLIENT_SECRET: z.string().optional(),
  CANVA_API_KEY: z.string().optional(),
  CANVA_REDIRECT_URI: z.string().url().optional(),

  // --- Meta (FB + IG) ---
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  FACEBOOK_PAGE_ID: z.string().optional(),
  INSTAGRAM_BUSINESS_ID: z.string().optional(),

  // --- LinkedIn ---
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_ORGANIZATION_URN: z.string().optional(),

  // --- WhatsApp Business (Cloud API alt to Twilio) ---
  WHATSAPP_BUSINESS_PHONE_ID: z.string().optional(),
  WHATSAPP_BUSINESS_TOKEN: z.string().optional(),

  // --- Cloudinary ---
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().default('lcbrs_default'),

  // --- Branding (public) ---
  NEXT_PUBLIC_BRAND_PRIMARY: z.string().default('#1e3a8a'),
  NEXT_PUBLIC_BRAND_ACCENT: z.string().default('#fbbf24'),
  NEXT_PUBLIC_BRAND_LOGO_URL: z.string().optional(),
});

const parsed = schema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_SECRET: process.env.RAZORPAY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_BOOTSTRAP_EMAIL: process.env.ADMIN_BOOTSTRAP_EMAIL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  CANVA_CLIENT_ID: process.env.CANVA_CLIENT_ID,
  CANVA_CLIENT_SECRET: process.env.CANVA_CLIENT_SECRET,
  CANVA_API_KEY: process.env.CANVA_API_KEY,
  CANVA_REDIRECT_URI: process.env.CANVA_REDIRECT_URI,
  META_APP_ID: process.env.META_APP_ID,
  META_APP_SECRET: process.env.META_APP_SECRET,
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID,
  INSTAGRAM_BUSINESS_ID: process.env.INSTAGRAM_BUSINESS_ID,
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
  LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN,
  LINKEDIN_ORGANIZATION_URN: process.env.LINKEDIN_ORGANIZATION_URN,
  WHATSAPP_BUSINESS_PHONE_ID: process.env.WHATSAPP_BUSINESS_PHONE_ID,
  WHATSAPP_BUSINESS_TOKEN: process.env.WHATSAPP_BUSINESS_TOKEN,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
  NEXT_PUBLIC_BRAND_PRIMARY: process.env.NEXT_PUBLIC_BRAND_PRIMARY,
  NEXT_PUBLIC_BRAND_ACCENT: process.env.NEXT_PUBLIC_BRAND_ACCENT,
  NEXT_PUBLIC_BRAND_LOGO_URL: process.env.NEXT_PUBLIC_BRAND_LOGO_URL,
});

export const env = parsed;

export function requireSupabaseEnv() {
  if (!parsed.NEXT_PUBLIC_SUPABASE_URL || !parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.',
    );
  }
  return {
    url: parsed.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseConfigured() {
  return Boolean(parsed.NEXT_PUBLIC_SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export const integrations = {
  supabase: isSupabaseConfigured(),
  supabaseAdmin: Boolean(parsed.SUPABASE_SERVICE_ROLE_KEY),
  razorpay: Boolean(parsed.RAZORPAY_KEY_ID && parsed.RAZORPAY_SECRET),
  resend: Boolean(parsed.RESEND_API_KEY),
  twilio: Boolean(parsed.TWILIO_ACCOUNT_SID && parsed.TWILIO_AUTH_TOKEN),
  openai: Boolean(parsed.OPENAI_API_KEY),
  canva: Boolean(parsed.CANVA_API_KEY || (parsed.CANVA_CLIENT_ID && parsed.CANVA_CLIENT_SECRET)),
  facebook: Boolean(parsed.META_ACCESS_TOKEN && parsed.FACEBOOK_PAGE_ID),
  instagram: Boolean(parsed.META_ACCESS_TOKEN && parsed.INSTAGRAM_BUSINESS_ID),
  linkedin: Boolean(parsed.LINKEDIN_ACCESS_TOKEN && parsed.LINKEDIN_ORGANIZATION_URN),
  whatsappBusiness: Boolean(parsed.WHATSAPP_BUSINESS_TOKEN && parsed.WHATSAPP_BUSINESS_PHONE_ID),
  cloudinary: Boolean(parsed.CLOUDINARY_CLOUD_NAME && parsed.CLOUDINARY_API_KEY && parsed.CLOUDINARY_API_SECRET),
};
