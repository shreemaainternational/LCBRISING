// Pure config for automation toggles — no server imports, safe to use from
// client components.

export type AutomationSettings = {
  officer_digest_enabled: boolean;
  birthday_greetings_enabled: boolean;
  anniversary_greetings_enabled: boolean;
  dues_reminders_enabled: boolean;
  lions_auto_sync_enabled: boolean;
  lions_auto_dedupe_enabled: boolean;
  enterprise_automation_enabled: boolean;
  auto_heal_enabled: boolean;
  auto_alert_enabled: boolean;
};

export const AUTOMATION_DEFAULTS: AutomationSettings = {
  officer_digest_enabled: true,
  birthday_greetings_enabled: true,
  anniversary_greetings_enabled: true,
  dues_reminders_enabled: true,
  lions_auto_sync_enabled: true,
  lions_auto_dedupe_enabled: true,
  enterprise_automation_enabled: true,
  auto_heal_enabled: true,
  auto_alert_enabled: true,
};

export const AUTOMATION_TOGGLES: { key: keyof AutomationSettings; label: string; description: string }[] = [
  { key: 'enterprise_automation_enabled', label: 'Enterprise AI conductor', description: 'Run the whole platform as one orchestrated pipeline on a schedule — Lions fetch → self-heal → drain jobs → health check → AI digest. Master switch for /admin/automation/enterprise.' },
  { key: 'auto_heal_enabled', label: 'Self-healing', description: 'On each conductor run, revive transiently-failed sync jobs and un-stick automation jobs abandoned mid-run — no manual "revive".' },
  { key: 'auto_alert_enabled', label: 'Auto-alert on regressions', description: 'When a conductor run fails or platform health drops, record an audit alert and push a notification to admins.' },
  { key: 'lions_auto_sync_enabled', label: 'Lions Portal auto-sync', description: 'Automatically pull districts, clubs & members from the Lions Portal / MyLCI on a schedule and update the system — no manual sync.' },
  { key: 'lions_auto_dedupe_enabled', label: 'AI duplicate scan after sync', description: 'After each auto-sync, run the AI duplicate detector and flag merged-member candidates for review.' },
  { key: 'officer_digest_enabled', label: 'Weekly officer digest', description: 'A 7-day summary emailed + WhatsApp’d to officers each week.' },
  { key: 'birthday_greetings_enabled', label: 'Birthday greetings', description: 'Daily birthday wishes to members over email + WhatsApp.' },
  { key: 'anniversary_greetings_enabled', label: 'Anniversary greetings', description: 'Daily service-anniversary greetings based on join date.' },
  { key: 'dues_reminders_enabled', label: 'Dues reminders', description: 'Reminders for dues coming due in the next 7 days.' },
];
