/**
 * Canonical registry of every integration this platform talks to.
 * Drives the /admin/integrations health dashboard and the
 * /api/integrations/status endpoint.
 */
import { integrations, env } from '@/lib/env';
import { isLionsApiConfigured, isLionsApiSandboxActive } from '@/lib/oidc/lions';
import { isOidcConfigured as isOidcConfiguredAtAll, isOidcSandboxActive } from '@/lib/oidc';
import { isCronAuthConfigured } from '@/lib/cron-auth';
import { isPushAutoConfigured } from '@/lib/push-config';
import { isOpenAiAutoConfigured } from '@/lib/ai/openai-config';

export type IntegrationCategory =
  | 'identity'
  | 'database'
  | 'payments'
  | 'messaging'
  | 'ai'
  | 'social'
  | 'media'
  | 'platform';

/**
 * Tri-state readiness:
 *  - 'live'     — configured with real external credentials.
 *  - 'degraded' — switched on but running in a non-production mode (sandbox
 *                 synthetic data, or a self-provisioned secret). Works, but
 *                 still "pending" real activation.
 *  - 'off'      — not configured (the platform degrades gracefully).
 */
export type IntegrationStatus = 'live' | 'degraded' | 'off';

export interface IntegrationEnvVar {
  name: string;
  required: boolean;
  /** True when the variable is intended to be exposed to the browser. */
  public?: boolean;
  /** Human description of what this var holds. */
  hint?: string;
}

export interface IntegrationDescriptor {
  key: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  configured: boolean;
  /** Tri-state readiness (configured === status !== 'off'). */
  status: IntegrationStatus;
  /** Short note shown for 'degraded' services, e.g. "Sandbox — synthetic data". */
  modeLabel?: string;
  envVars: IntegrationEnvVar[];
  docsHref?: string;
  adminHref?: string;
  /** Plain-language indicator of what stops working when this is off. */
  whenMissing?: string;
}

function v(name: string, required = true, opts: Omit<IntegrationEnvVar, 'name' | 'required'> = {}): IntegrationEnvVar {
  return { name, required, ...opts };
}

/**
 * Per-integration degraded-mode detection. Returns a label when a service is
 * "on" but not running on real production credentials, otherwise undefined.
 * Keyed by descriptor.key; integrations not listed are simple live/off.
 */
function degradedModeLabel(key: string): string | undefined {
  switch (key) {
    case 'lions_oidc':
      return isOidcSandboxActive() ? 'Sandbox — synthetic Lions sign-in' : undefined;
    case 'lions_rest':
      return isLionsApiSandboxActive() ? 'Sandbox — synthetic districts / clubs / members' : undefined;
    case 'web_push':
      // Env keypair = real/pinned; DB auto-generated keypair = degraded.
      return !integrations.webPush && isPushAutoConfigured()
        ? 'Auto-generated keypair (stored in DB — set VAPID_* to pin)'
        : undefined;
    case 'vercel_cron':
      // Env secret = real/pinned; DB auto-provisioned secret = degraded.
      return !env.CRON_SECRET && isCronAuthConfigured()
        ? 'Auto-provisioned secret (set CRON_SECRET for Vercel)'
        : undefined;
    default:
      return undefined;
  }
}

export function getIntegrationRegistry(): IntegrationDescriptor[] {
  return baseRegistry().map((d) => {
    const modeLabel = d.configured ? degradedModeLabel(d.key) : undefined;
    const status: IntegrationStatus = !d.configured ? 'off' : modeLabel ? 'degraded' : 'live';
    return { ...d, status, modeLabel };
  });
}

type BaseDescriptor = Omit<IntegrationDescriptor, 'status' | 'modeLabel'>;

function baseRegistry(): BaseDescriptor[] {
  return [
    // ---------------- IDENTITY ----------------
    {
      key: 'supabase_auth',
      name: 'Supabase Auth',
      category: 'identity',
      description: 'Email-based sign-in for admins and members. Backs /login.',
      configured: integrations.supabase,
      envVars: [
        v('NEXT_PUBLIC_SUPABASE_URL', true, { public: true }),
        v('NEXT_PUBLIC_SUPABASE_ANON_KEY', true, { public: true }),
      ],
      whenMissing: 'Sign-in, member portal, and all CRM pages are unavailable.',
      adminHref: '/admin',
    },
    {
      key: 'supabase_service_role',
      name: 'Supabase Service Role',
      category: 'identity',
      description: 'Admin client used by cron jobs, sync, reports and webhooks to bypass RLS.',
      configured: integrations.supabaseAdmin,
      envVars: [
        v('SUPABASE_SERVICE_ROLE_KEY', true, { hint: 'Private key — never expose in browser' }),
      ],
      whenMissing: 'Cron reports, OIDC auto-provisioning, and sync paths degrade or fail.',
    },
    {
      key: 'lions_oidc',
      name: 'Lions International SSO',
      category: 'identity',
      description: 'OIDC (PKCE + JWKS + discovery) with role mapping and MyLCI claim support. Configure in-app or via env.',
      configured: integrations.lionsOidc || isOidcConfiguredAtAll(),
      envVars: [
        v('LIONS_OIDC_ISSUER', true),
        v('LIONS_OIDC_CLIENT_ID', true),
        v('LIONS_OIDC_CLIENT_SECRET', false),
        v('LIONS_OIDC_REDIRECT_URI', true),
        v('LIONS_OIDC_SCOPES', false, { hint: 'Defaults to "openid profile email"' }),
        v('LIONS_OIDC_AUDIENCE', false),
        v('LIONS_OIDC_PROVIDER_LABEL', false),
        v('LIONS_OIDC_DISCOVERY_URL', false, { hint: 'Override .well-known URL' }),
      ],
      whenMissing: "The \"Sign in with Lions\" button on /login is hidden.",
      adminHref: '/admin/integrations/oidc',
    },
    {
      key: 'lions_rest',
      name: 'Lions International REST API',
      category: 'identity',
      description: 'MyLCI-shape REST adapter for syncing districts, clubs, and members. Dry-run mode when unset.',
      configured: isLionsApiConfigured(),
      envVars: [
        v('LIONS_API_BASE_URL', true),
        v('LIONS_API_KEY', false),
        v('LIONS_API_ACCESS_TOKEN', false),
        v('LIONS_API_DISTRICT_CODE', false),
        v('LIONS_API_MULTI_DISTRICT_CODE', false),
      ],
      whenMissing: 'Sync runs in dry-run mode and returns zeroed counts.',
      adminHref: '/admin/sync/lions',
    },

    // ---------------- PAYMENTS ----------------
    {
      key: 'razorpay',
      name: 'Razorpay',
      category: 'payments',
      description: 'Card / netbanking / UPI gateway with hosted checkout, refunds, recurring invoices and webhook reconciliation.',
      configured: integrations.razorpay,
      envVars: [
        v('RAZORPAY_KEY_ID', true),
        v('RAZORPAY_SECRET', true),
        v('RAZORPAY_WEBHOOK_SECRET', false, { hint: 'For signature-verified webhook ingestion' }),
        v('NEXT_PUBLIC_RAZORPAY_KEY_ID', false, { public: true }),
      ],
      whenMissing: 'Card / hosted checkout flows are disabled. UPI deep-links still work.',
      adminHref: '/admin/payments',
    },
    {
      key: 'phonepe',
      name: 'PhonePe',
      category: 'payments',
      description: 'PhonePe Standard Checkout for UPI-first payment flows.',
      configured: integrations.phonepe,
      envVars: [
        v('PHONEPE_MERCHANT_ID', true),
        v('PHONEPE_SALT_KEY', true),
      ],
      whenMissing: 'PhonePe-hosted checkout button is hidden.',
      adminHref: '/admin/payments',
    },
    {
      key: 'upi',
      name: 'UPI Deep-links',
      category: 'payments',
      description: 'PhonePe / GPay / Paytm intent URLs + dynamic UPI QR codes for /pay/[id].',
      configured: !!env.UPI_VPA,
      envVars: [
        v('UPI_VPA', true, { hint: 'Payee VPA, e.g. lcbarodarisingstar@hdfcbank' }),
        v('UPI_PAYEE_NAME', false),
        v('UPI_MERCHANT_CODE', false, { hint: 'MCC code (optional)' }),
      ],
      whenMissing: 'UPI QR + deep-link buttons on /pay/[id] are hidden.',
    },

    // ---------------- MESSAGING ----------------
    {
      key: 'resend',
      name: 'Resend (Email)',
      category: 'messaging',
      description: 'Transactional email — receipts, payment confirmations, OTP, member portal links.',
      configured: integrations.resend,
      envVars: [
        v('RESEND_API_KEY', true),
        v('RESEND_FROM_EMAIL', false),
      ],
      whenMissing: 'Donation receipts, OTP and payment emails are not delivered.',
    },
    {
      key: 'twilio',
      name: 'Twilio (SMS / WhatsApp)',
      category: 'messaging',
      description: 'SMS and WhatsApp Business via Twilio sandbox / approved sender.',
      configured: integrations.twilio,
      envVars: [
        v('TWILIO_ACCOUNT_SID', true),
        v('TWILIO_AUTH_TOKEN', true),
        v('TWILIO_WHATSAPP_FROM', false, { hint: 'WhatsApp-enabled Twilio sender, e.g. whatsapp:+1...' }),
      ],
      whenMissing: 'Outbound SMS and Twilio WhatsApp notifications stop.',
    },
    {
      key: 'whatsapp_business',
      name: 'WhatsApp Business Cloud',
      category: 'messaging',
      description: "Meta WhatsApp Business Cloud API — preferred for outbound notifications and templates.",
      configured: integrations.whatsappBusiness,
      envVars: [
        v('WHATSAPP_BUSINESS_TOKEN', true),
        v('WHATSAPP_BUSINESS_PHONE_ID', true),
      ],
      whenMissing: 'Falls back to Twilio WhatsApp (if configured) or no WhatsApp at all.',
    },
    {
      key: 'web_push',
      name: 'Web Push (VAPID)',
      category: 'messaging',
      description: 'PWA push notifications. Broadcast / topic / per-member. Keypair is auto-generated on first install and stored in push_settings.',
      configured: integrations.webPush || isPushAutoConfigured(),
      envVars: [
        v('VAPID_PUBLIC_KEY', false, { hint: 'Optional — env value overrides the DB-stored keypair' }),
        v('VAPID_PRIVATE_KEY', false, { hint: 'Optional — env value overrides the DB-stored keypair' }),
        v('VAPID_SUBJECT', false, { hint: 'mailto:admin@yourdomain — defaults to mailto:admin@lcbaroda.org' }),
        v('NEXT_PUBLIC_VAPID_PUBLIC_KEY', false, { public: true, hint: 'Optional — runtime API serves the public key dynamically' }),
      ],
      whenMissing: '/admin/notifications broadcast is disabled and mobile push toggle is inert.',
      adminHref: '/admin/integrations/push',
    },

    // ---------------- AI ----------------
    {
      key: 'openai',
      name: 'OpenAI (Chat + Vision)',
      category: 'ai',
      description: 'AI narrative writer (EN+GU+bilingual), AI greeting generator, creative builder, club insights, member dedupe, UPI proof OCR, expense bill OCR. Configure in-app at /admin/integrations/openai or via env.',
      configured: integrations.openai || isOpenAiAutoConfigured(),
      envVars: [
        v('OPENAI_API_KEY', false, { hint: 'Optional — env value overrides the DB-stored key' }),
        v('OPENAI_MODEL', false, { hint: 'Defaults to gpt-4o-mini' }),
      ],
      whenMissing: 'AI features fall back to hand-written templates (still usable). Paste a key for AI generation.',
      adminHref: '/admin/integrations/openai',
    },

    // ---------------- SOCIAL ----------------
    {
      key: 'facebook',
      name: 'Meta — Facebook Pages',
      category: 'social',
      description: 'Auto-post to the club Facebook Page with images & captions.',
      configured: integrations.facebook,
      envVars: [
        v('META_APP_ID', false),
        v('META_APP_SECRET', false),
        v('META_ACCESS_TOKEN', true),
        v('FACEBOOK_PAGE_ID', true),
      ],
      whenMissing: 'Facebook posting from /admin/social is disabled.',
      adminHref: '/admin/social',
    },
    {
      key: 'instagram',
      name: 'Meta — Instagram Business',
      category: 'social',
      description: 'Auto-post to the club Instagram Business account.',
      configured: integrations.instagram,
      envVars: [
        v('META_ACCESS_TOKEN', true),
        v('INSTAGRAM_BUSINESS_ID', true),
      ],
      whenMissing: 'Instagram posting from /admin/social is disabled.',
      adminHref: '/admin/social',
    },
    {
      key: 'linkedin',
      name: 'LinkedIn Organization',
      category: 'social',
      description: 'Auto-post to the club LinkedIn organization page.',
      configured: integrations.linkedin,
      envVars: [
        v('LINKEDIN_CLIENT_ID', false),
        v('LINKEDIN_ACCESS_TOKEN', true),
        v('LINKEDIN_ORGANIZATION_URN', true, { hint: 'urn:li:organization:1234567' }),
      ],
      whenMissing: 'LinkedIn posting from /admin/social is disabled.',
      adminHref: '/admin/social',
    },

    // ---------------- MEDIA ----------------
    {
      key: 'canva',
      name: 'Canva',
      category: 'media',
      description: 'Canva Connect API for branded creatives / event posters.',
      configured: integrations.canva,
      envVars: [
        v('CANVA_CLIENT_ID', false),
        v('CANVA_CLIENT_SECRET', false),
        v('CANVA_API_KEY', false),
        v('CANVA_REDIRECT_URI', false),
      ],
      whenMissing: 'Canva-powered creative actions on /admin/creative degrade.',
      adminHref: '/admin/creative',
    },
    {
      key: 'cloudinary',
      name: 'Cloudinary',
      category: 'media',
      description: 'Hosted media CDN for activity photos, before/after galleries, event covers.',
      configured: integrations.cloudinary,
      envVars: [
        v('CLOUDINARY_CLOUD_NAME', true),
        v('CLOUDINARY_API_KEY', true),
        v('CLOUDINARY_API_SECRET', true),
      ],
      whenMissing: 'Uploaded photos fall back to Supabase Storage if available.',
      adminHref: '/admin/media',
    },

    // ---------------- PLATFORM ----------------
    {
      key: 'vercel_cron',
      name: 'Vercel Cron',
      category: 'platform',
      description: 'Scheduled jobs — daily automation engine + monthly / quarterly / half-yearly / yearly report generation. Secret is auto-provisioned in the database on first install.',
      configured: isCronAuthConfigured(),
      envVars: [
        v('CRON_SECRET', false, { hint: 'Optional — env value takes precedence over the DB-stored secret. Useful for production where Vercel sends the Authorization header.' }),
      ],
      whenMissing: 'Scheduled cron jobs run without auth and return 401 on Vercel.',
      adminHref: '/admin/integrations/cron',
    },
    {
      key: 'pwa',
      name: 'PWA Shell',
      category: 'platform',
      description: 'Mobile app at /m, installable home-screen icon, offline shell cache, push notifications.',
      configured: true,
      envVars: [],
      whenMissing: 'Always on — files are baked into the build.',
      adminHref: '/m',
    },
  ];
}

export function summarizeIntegrations() {
  const all = getIntegrationRegistry();
  return {
    total: all.length,
    configured: all.filter((i) => i.configured).length,
    missing: all.filter((i) => !i.configured).length,
    // Tri-state breakdown.
    live: all.filter((i) => i.status === 'live').length,
    degraded: all.filter((i) => i.status === 'degraded').length,
    off: all.filter((i) => i.status === 'off').length,
    byCategory: all.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {}),
  };
}
