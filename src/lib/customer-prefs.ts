import { createAdminClient } from '@/lib/supabase/server';
import { normalisePhone } from '@/lib/phone';

export interface CustomerPrefs {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  reminders_enabled: boolean;
  language: string;
}

const DEFAULT: CustomerPrefs = {
  whatsapp_enabled: true,
  email_enabled: true,
  reminders_enabled: true,
  language: 'en',
};

export async function getPrefsForPhone(phoneRaw: string | null | undefined): Promise<CustomerPrefs> {
  if (!phoneRaw) return DEFAULT;
  const norm = normalisePhone(phoneRaw);
  if (!norm) return DEFAULT;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('customer_preferences')
    .select('whatsapp_enabled, email_enabled, reminders_enabled, language')
    .eq('phone_norm', norm)
    .maybeSingle();
  if (!data) return DEFAULT;
  return data as CustomerPrefs;
}

export async function upsertPrefs(phoneNorm: string, partial: Partial<CustomerPrefs>) {
  const supabase = createAdminClient();
  await supabase
    .from('customer_preferences')
    .upsert(
      {
        phone_norm: phoneNorm,
        ...partial,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone_norm' },
    );
}
