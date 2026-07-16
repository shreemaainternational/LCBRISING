import { z } from 'zod';

/**
 * Normalize a Supabase project URL down to its bare origin.
 *
 * Supabase API URLs are ALWAYS just `https://<ref>.supabase.co` (or a
 * custom-domain root) with no path. supabase-js builds every request by
 * appending a service prefix (`/auth/v1/token`, `/rest/v1/<table>`, …) to
 * this value. If the configured URL carries a stray trailing slash, an
 * accidental path (`/rest/v1`), surrounding whitespace, or the direct-DB
 * host (`db.<ref>.supabase.co`, which is Postgres — NOT the API gateway),
 * the composed request path is wrong and Supabase's gateway rejects it
 * with "Invalid path specified in request URL" (auth) or a schema/route
 * error (rest). Collapsing to the origin here makes those env typos
 * harmless instead of a hard, cryptic login failure.
 */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = (raw ?? '').trim();
  try {
    const u = new URL(trimmed);
    // The direct-database host is not the API gateway. Map it back to the
    // gateway host so auth/rest calls resolve. Guarded to the exact
    // `db.<ref>.supabase.co` shape so custom domains are untouched.
    const host = /^db\.[a-z0-9]+\.supabase\.co$/i.test(u.host)
      ? u.host.replace(/^db\./i, '')
      : u.host;
    return `${u.protocol}//${host}`;
  } catch {
    // Not a parseable URL — fall back to trimming a trailing slash so the
    // downstream zod .url() check still runs against the caller's value.
    return trimmed.replace(/\/+$/, '');
  }
}

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default(
      // Never fall back to localhost in production — that would poison every
      // canonical/OG URL, the sitemap, and robots.txt with localhost links.
      process.env.NODE_ENV === 'production'
        ? 'https://barodarisingstar.com'
        : 'http://localhost:3000',
    ),
  NEXT_PUBLIC_SITE_NAME: z.string().default('Lions Club of Baroda Rising Star'),

  // Supabase is optional at module-load time so the app still builds
  // and serves marketing pages before the project is wired up.
  // Routes that actually call Supabase will throw a clear error if missing.
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .default('https://mvtqqlfzawyhntnsavbx.supabase.co')
    .transform(normalizeSupabaseUrl),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).default("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dHFxbGZ6YXd5aG50bnNhdmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODk3OTksImV4cCI6MjA5MTA2NTc5OX0.x4m5jPXReQLikS2N2vox-ck406RzpqWOc-0qLOstqS4"),
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
  // TEMPORARY diagnostic bypass — set to "1" to skip auth on /admin/*
  // and return a synthetic admin member. Remove in production.
  ADMIN_AUTH_BYPASS: z.string().optional(),

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

  // --- UPI / PhonePe payment collection ---
  // VPAs are not secrets — defaulting here so the payment module works
  // out of the box. Override via env to change the merchant account.
  UPI_VPA: z.string().default('9712299333@ybl'),
  UPI_PAYEE_NAME: z.string().default('Lions Club of Baroda Rising Star'),
  UPI_MERCHANT_CODE: z.string().optional(),
  PHONEPE_MERCHANT_ID: z.string().optional(),
  PHONEPE_SALT_KEY: z.string().optional(),
  PHONEPE_SALT_INDEX: z.string().optional(),
  PHONEPE_WEBHOOK_USERNAME: z.string().optional(),
  PHONEPE_WEBHOOK_PASSWORD: z.string().optional(),
  NEXT_PUBLIC_UPI_VPA: z.string().default('9712299333@ybl'),
  NEXT_PUBLIC_UPI_PAYEE_NAME: z.string().default('Lions Club of Baroda Rising Star'),
  NEXT_PUBLIC_STATIC_QR_URL: z.string().url().optional(),

  // Customer portal session signing. If unset, falls back to the
  // service role key (already secret) so the portal still works.
  PORTAL_SESSION_SECRET: z.string().optional(),

  // --- Lions OIDC / SSO (provider-agnostic) ---
  LIONS_OIDC_ISSUER: z.string().url().optional(),
  LIONS_OIDC_DISCOVERY_URL: z.string().url().optional(),
  LIONS_OIDC_CLIENT_ID: z.string().optional(),
  LIONS_OIDC_CLIENT_SECRET: z.string().optional(),
  LIONS_OIDC_REDIRECT_URI: z.string().url().optional(),
  LIONS_OIDC_SCOPES: z.string().optional(),
  LIONS_OIDC_AUDIENCE: z.string().optional(),
  LIONS_OIDC_PROVIDER_LABEL: z.string().optional(),

  // --- Lions International REST API (optional) ---
  LIONS_API_BASE_URL: z.string().url().optional(),
  LIONS_API_KEY: z.string().optional(),
  LIONS_API_ACCESS_TOKEN: z.string().optional(),
  LIONS_API_DISTRICT_CODE: z.string().optional(),
  LIONS_API_MULTI_DISTRICT_CODE: z.string().optional(),
  LIONS_WEBHOOK_SECRET: z.string().optional(),

  // --- Lions Portal (District Governor login) sync (optional) ---
  LIONS_PORTAL_LOGIN_URL: z.string().url().optional(),
  LIONS_PORTAL_DATA_URL: z.string().url().optional(),
  LIONS_PORTAL_USERNAME: z.string().optional(),
  LIONS_PORTAL_PASSWORD: z.string().optional(),
  LIONS_PORTAL_DISTRICT_CODE: z.string().optional(),

  // --- Secret encryption at rest (AES-256-GCM wrapper) ---
  SECRET_ENCRYPTION_KEY: z.string().optional(),

  // --- Web Push (VAPID) ---
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
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
  ADMIN_AUTH_BYPASS: process.env.ADMIN_AUTH_BYPASS,
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
  UPI_VPA: process.env.UPI_VPA,
  UPI_PAYEE_NAME: process.env.UPI_PAYEE_NAME,
  UPI_MERCHANT_CODE: process.env.UPI_MERCHANT_CODE,
  PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY: process.env.PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX: process.env.PHONEPE_SALT_INDEX,
  PHONEPE_WEBHOOK_USERNAME: process.env.PHONEPE_WEBHOOK_USERNAME,
  PHONEPE_WEBHOOK_PASSWORD: process.env.PHONEPE_WEBHOOK_PASSWORD,
  NEXT_PUBLIC_UPI_VPA: process.env.NEXT_PUBLIC_UPI_VPA,
  NEXT_PUBLIC_UPI_PAYEE_NAME: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME,
  NEXT_PUBLIC_STATIC_QR_URL: process.env.NEXT_PUBLIC_STATIC_QR_URL,
  PORTAL_SESSION_SECRET: process.env.PORTAL_SESSION_SECRET,
  LIONS_OIDC_ISSUER: process.env.LIONS_OIDC_ISSUER,
  LIONS_OIDC_DISCOVERY_URL: process.env.LIONS_OIDC_DISCOVERY_URL,
  LIONS_OIDC_CLIENT_ID: process.env.LIONS_OIDC_CLIENT_ID,
  LIONS_OIDC_CLIENT_SECRET: process.env.LIONS_OIDC_CLIENT_SECRET,
  LIONS_OIDC_REDIRECT_URI: process.env.LIONS_OIDC_REDIRECT_URI,
  LIONS_OIDC_SCOPES: process.env.LIONS_OIDC_SCOPES,
  LIONS_OIDC_AUDIENCE: process.env.LIONS_OIDC_AUDIENCE,
  LIONS_OIDC_PROVIDER_LABEL: process.env.LIONS_OIDC_PROVIDER_LABEL,
  LIONS_API_BASE_URL: process.env.LIONS_API_BASE_URL,
  LIONS_API_KEY: process.env.LIONS_API_KEY,
  LIONS_API_ACCESS_TOKEN: process.env.LIONS_API_ACCESS_TOKEN,
  LIONS_API_DISTRICT_CODE: process.env.LIONS_API_DISTRICT_CODE,
  LIONS_API_MULTI_DISTRICT_CODE: process.env.LIONS_API_MULTI_DISTRICT_CODE,
  LIONS_WEBHOOK_SECRET: process.env.LIONS_WEBHOOK_SECRET,
  LIONS_PORTAL_LOGIN_URL: process.env.LIONS_PORTAL_LOGIN_URL,
  LIONS_PORTAL_DATA_URL: process.env.LIONS_PORTAL_DATA_URL,
  LIONS_PORTAL_USERNAME: process.env.LIONS_PORTAL_USERNAME,
  LIONS_PORTAL_PASSWORD: process.env.LIONS_PORTAL_PASSWORD,
  LIONS_PORTAL_DISTRICT_CODE: process.env.LIONS_PORTAL_DISTRICT_CODE,
  SECRET_ENCRYPTION_KEY: process.env.SECRET_ENCRYPTION_KEY,
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

export const env = parsed;

/**
 * Development-only admin auth bypass.
 *
 * Returns true ONLY outside production AND when ADMIN_AUTH_BYPASS=1.
 * It can NEVER be true in a production deployment, regardless of the
 * env var or any cookie — this permanently closes the public admin
 * backdoor that the old `/crm` cookie shortcut created. Use for local
 * development only.
 */
export function isDevAuthBypass(): boolean {
  return process.env.NODE_ENV !== 'production' && parsed.ADMIN_AUTH_BYPASS === '1';
}

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
  upi: Boolean(parsed.UPI_VPA),
  phonepe: Boolean(parsed.PHONEPE_MERCHANT_ID && parsed.PHONEPE_SALT_KEY),
  lionsOidc: Boolean(parsed.LIONS_OIDC_ISSUER && parsed.LIONS_OIDC_CLIENT_ID && parsed.LIONS_OIDC_REDIRECT_URI),
  webPush: Boolean(parsed.VAPID_PUBLIC_KEY && parsed.VAPID_PRIVATE_KEY),
};
