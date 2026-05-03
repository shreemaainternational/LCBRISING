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
};
