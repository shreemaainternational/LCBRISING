import { createAdminClient } from '@/lib/supabase/server';
import { AUTOMATION_DEFAULTS, type AutomationSettings } from '@/lib/automation/settings-config';

export {
  AUTOMATION_DEFAULTS,
  AUTOMATION_TOGGLES,
  type AutomationSettings,
} from '@/lib/automation/settings-config';

/**
 * Read the automation toggles. Falls back to all-enabled if the table is not
 * applied yet or on any error, so automations keep working out of the box.
 * Server-only (uses the admin Supabase client).
 */
export async function getAutomationSettings(): Promise<AutomationSettings> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('automation_settings')
      .select('officer_digest_enabled, birthday_greetings_enabled, anniversary_greetings_enabled, dues_reminders_enabled, lions_auto_sync_enabled, lions_auto_dedupe_enabled, enterprise_automation_enabled, auto_heal_enabled, auto_alert_enabled')
      .eq('id', 'singleton')
      .maybeSingle();
    if (error || !data) return AUTOMATION_DEFAULTS;
    return {
      officer_digest_enabled: data.officer_digest_enabled ?? true,
      birthday_greetings_enabled: data.birthday_greetings_enabled ?? true,
      anniversary_greetings_enabled: data.anniversary_greetings_enabled ?? true,
      dues_reminders_enabled: data.dues_reminders_enabled ?? true,
      lions_auto_sync_enabled: data.lions_auto_sync_enabled ?? true,
      lions_auto_dedupe_enabled: data.lions_auto_dedupe_enabled ?? true,
      enterprise_automation_enabled: data.enterprise_automation_enabled ?? true,
      auto_heal_enabled: data.auto_heal_enabled ?? true,
      auto_alert_enabled: data.auto_alert_enabled ?? true,
    };
  } catch {
    return AUTOMATION_DEFAULTS;
  }
}
