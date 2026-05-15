import { integrations } from '@/lib/env';
import { isLionsApiConfigured as isLionsApiConfiguredFn } from '@/lib/oidc/lions';

export function isOidcConfiguredFlag(): boolean {
  return integrations.lionsOidc;
}

export function isLionsApiConfigured(): boolean {
  return isLionsApiConfiguredFn();
}
