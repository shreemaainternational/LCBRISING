import { createAdminClient } from '@/lib/supabase/server';
import { renderPlainEmail } from '@/lib/email';

/** Replace {{key}} placeholders with values (missing keys → empty string). */
export function applyVars(text: string, vars: Record<string, string | number | null | undefined>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? '' : String(v);
  });
}

/**
 * Transactional-email keys that officers can override from the CRM template
 * editor. Setting a template's `key` to one of these makes automated emails
 * use the edited copy instead of the built-in default.
 */
export const TRANSACTIONAL_EMAIL_KEYS = [
  'welcome',
  'dues_reminder',
  'donation_receipt',
  'event_reminder',
] as const;

/**
 * Resolve an email subject+html for a template key. If an officer has saved a
 * `message_templates` row with that key, use it (with {{var}} substitution
 * rendered into the branded shell); otherwise fall back to the built-in
 * template. Any DB/lookup error falls back too, so sends never break.
 */
export async function resolveEmailTemplate(
  key: string,
  vars: Record<string, string | number | null | undefined>,
  fallback: () => { subject: string; html: string },
): Promise<{ subject: string; html: string }> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('message_templates')
      .select('subject, body')
      .eq('key', key)
      .maybeSingle();
    if (error || !data || !data.body) return fallback();
    const fb = fallback();
    return {
      subject: data.subject ? applyVars(data.subject, vars) : fb.subject,
      html: renderPlainEmail(applyVars(data.body, vars)),
    };
  } catch {
    return fallback();
  }
}
