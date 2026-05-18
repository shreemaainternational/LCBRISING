import { isOidcConfigured } from '@/lib/oidc';
import { isLionsApiConfigured as isLionsApiConfiguredFn } from '@/lib/oidc/lions';

export function isOidcConfiguredFlag(): boolean {
  // Consults both env and the cached DB singleton (call
  // loadOidcSettings(true) once before this in async callers).
  return isOidcConfigured();
}

export function isLionsApiConfigured(): boolean {
  return isLionsApiConfiguredFn();
}
