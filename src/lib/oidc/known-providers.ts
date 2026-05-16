/**
 * One-click presets for the OIDC setup wizard.
 * Lions International values are based on the LCI Developer API
 * program. Adjust if the registered issuer URL changes.
 */

export interface OidcProviderPreset {
  key: 'lions' | 'google' | 'microsoft' | 'okta' | 'custom';
  label: string;
  blurb: string;
  defaults: {
    issuer: string;
    scopes: string;
    provider_label: string;
    discovery_url?: string;
    audience?: string;
  };
  /** Helpful next steps to surface in the UI. */
  notes?: string[];
  /** Optional doc link. */
  docsUrl?: string;
}

export const OIDC_PROVIDER_PRESETS: OidcProviderPreset[] = [
  {
    key: 'lions',
    label: 'Lions International (LCI)',
    blurb:
      'Official Lions International identity provider — used by MyLion, MyLCI and ' +
      'Lions Member Portal. Returns claims like lions_member_id, club_id, district_code, ' +
      'and roles (club_president, district_governor, multiple_district_admin, etc.).',
    defaults: {
      issuer: 'https://login.lionsclubs.org',
      scopes: 'openid profile email lions.member lions.club lions.district',
      provider_label: 'Lions International',
      audience: 'https://api.lionsclubs.org',
    },
    notes: [
      'Apply for API access at the LCI Developer portal — you will receive a Client ID and Client Secret.',
      'Register your redirect URI exactly as shown below. Lions International requires HTTPS.',
      'Lions role claims map automatically: club_president → club_president, district_governor → district_governor, multiple_district_admin → multiple_district_admin.',
      'For test environments, ask LCI for a sandbox issuer (typically login.staging.lionsclubs.org).',
    ],
    docsUrl: 'https://developer.lionsclubs.org',
  },
  {
    key: 'google',
    label: 'Google Workspace',
    blurb: 'Test or fallback provider. Useful when LCI credentials are pending or for non-Lions admins.',
    defaults: {
      issuer: 'https://accounts.google.com',
      scopes: 'openid profile email',
      provider_label: 'Google',
    },
    notes: [
      'Create OAuth credentials at console.cloud.google.com → APIs & Services → Credentials.',
      'Add the redirect URI to the "Authorized redirect URIs" list.',
      'Lions roles will not be present — roles must be managed inside the CRM.',
    ],
  },
  {
    key: 'microsoft',
    label: 'Microsoft Entra ID',
    blurb: 'For clubs using Microsoft 365 / Entra ID for officer accounts.',
    defaults: {
      issuer: 'https://login.microsoftonline.com/common/v2.0',
      scopes: 'openid profile email',
      provider_label: 'Microsoft',
    },
    notes: [
      'Register an app in Microsoft Entra admin center.',
      'Add the redirect URI under Authentication → Web → Redirect URIs.',
      'Create a client secret under Certificates & Secrets.',
    ],
  },
  {
    key: 'okta',
    label: 'Okta',
    blurb: 'Generic Okta-hosted OIDC provider. Replace the issuer with your Okta domain.',
    defaults: {
      issuer: 'https://YOUR_DOMAIN.okta.com',
      scopes: 'openid profile email',
      provider_label: 'Okta',
    },
    notes: [
      'Create an OIDC Web App in your Okta admin console.',
      'Set the issuer to your full Okta domain.',
    ],
  },
  {
    key: 'custom',
    label: 'Custom OIDC provider',
    blurb: 'Any RFC 6749 + OIDC compliant provider that publishes a discovery document.',
    defaults: {
      issuer: '',
      scopes: 'openid profile email',
      provider_label: 'Custom',
    },
  },
];

export function findPreset(key: string): OidcProviderPreset | undefined {
  return OIDC_PROVIDER_PRESETS.find((p) => p.key === key);
}
