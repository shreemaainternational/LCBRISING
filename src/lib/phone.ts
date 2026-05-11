/**
 * Normalise an Indian phone number to last-10 digits.
 * Returns null if the input has fewer than 10 digits.
 */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * Common Indian-format variants for SQL filtering. Includes the
 * original last-10, +91, 91, 0 prefixes.
 */
export function phoneVariants(norm: string): string[] {
  return [norm, `+91${norm}`, `91${norm}`, `0${norm}`];
}
