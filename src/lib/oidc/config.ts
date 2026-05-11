import { env } from '@/lib/env';

export type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  audience?: string;
  providerLabel: string;
  /** Optional override for the OIDC discovery document URL. */
  discoveryUrl?: string;
};

export function getOidcConfig(): OidcConfig {
  const issuer = env.LIONS_OIDC_ISSUER;
  const clientId = env.LIONS_OIDC_CLIENT_ID;
  const redirectUri = env.LIONS_OIDC_REDIRECT_URI;
  if (!issuer || !clientId || !redirectUri) {
    throw new Error(
      'OIDC is not configured. Set LIONS_OIDC_ISSUER, LIONS_OIDC_CLIENT_ID, and LIONS_OIDC_REDIRECT_URI.',
    );
  }
  return {
    issuer,
    clientId,
    clientSecret: env.LIONS_OIDC_CLIENT_SECRET,
    redirectUri,
    scopes: (env.LIONS_OIDC_SCOPES ?? 'openid profile email').split(/\s+/).filter(Boolean),
    audience: env.LIONS_OIDC_AUDIENCE,
    providerLabel: env.LIONS_OIDC_PROVIDER_LABEL ?? 'Lions',
    discoveryUrl: env.LIONS_OIDC_DISCOVERY_URL,
  };
}

export function isOidcConfigured(): boolean {
  return Boolean(
    env.LIONS_OIDC_ISSUER &&
      env.LIONS_OIDC_CLIENT_ID &&
      env.LIONS_OIDC_REDIRECT_URI,
  );
}
