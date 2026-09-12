import { env, isLionsSandboxAllowed } from '@/lib/env';
import { peekOidcSettings, type OidcSettings } from './runtime-config';

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

/** Merge env vars with the cached DB singleton (DB wins when active). */
function merge(): {
  issuer?: string; clientId?: string; clientSecret?: string; redirectUri?: string;
  scopes?: string; audience?: string; providerLabel?: string; discoveryUrl?: string;
} {
  const db: OidcSettings | null = peekOidcSettings();
  return {
    issuer:        db?.issuer         ?? env.LIONS_OIDC_ISSUER,
    clientId:      db?.client_id      ?? env.LIONS_OIDC_CLIENT_ID,
    clientSecret:  db?.client_secret  ?? env.LIONS_OIDC_CLIENT_SECRET,
    redirectUri:   db?.redirect_uri   ?? env.LIONS_OIDC_REDIRECT_URI,
    scopes:        db?.scopes         ?? env.LIONS_OIDC_SCOPES,
    audience:      db?.audience       ?? env.LIONS_OIDC_AUDIENCE,
    providerLabel: db?.provider_label ?? env.LIONS_OIDC_PROVIDER_LABEL,
    discoveryUrl:  db?.discovery_url  ?? env.LIONS_OIDC_DISCOVERY_URL,
  };
}

export function getOidcConfig(): OidcConfig {
  const m = merge();
  if (!m.issuer || !m.clientId || !m.redirectUri) {
    throw new Error(
      'OIDC is not configured. Set up via /admin/integrations/oidc or provide LIONS_OIDC_ISSUER, LIONS_OIDC_CLIENT_ID, and LIONS_OIDC_REDIRECT_URI env vars.',
    );
  }
  return {
    issuer: m.issuer,
    clientId: m.clientId,
    clientSecret: m.clientSecret,
    redirectUri: m.redirectUri,
    scopes: (m.scopes ?? 'openid profile email').split(/\s+/).filter(Boolean),
    audience: m.audience,
    providerLabel: m.providerLabel ?? 'Lions',
    discoveryUrl: m.discoveryUrl,
  };
}

export function isOidcConfigured(): boolean {
  const m = merge();
  if (isOidcSandboxUsable()) return true;
  return Boolean(m.issuer && m.clientId && m.redirectUri);
}

export function isOidcSandboxActive(): boolean {
  return Boolean(peekOidcSettings()?.sandbox_mode);
}

/**
 * Whether the sandbox_mode DB toggle is both on and actually reachable —
 * i.e. it won't hit the live-production block in /api/auth/oidc/sandbox.
 * Callers deciding whether to route into the sandbox flow (rather than
 * just reporting its on/off state) should use this, not
 * isOidcSandboxActive, so a stray sandbox_mode=true left on in production
 * doesn't get reported as "configured" when it's actually a dead end.
 */
export function isOidcSandboxUsable(): boolean {
  return isOidcSandboxActive() && isLionsSandboxAllowed();
}
