// Pure config for automation toggles — no server imports, safe to use from
// client components.

export type AutomationSettings = {
  officer_digest_enabled: boolean;
  birthday_greetings_enabled: boolean;
  anniversary_greetings_enabled: boolean;
  dues_reminders_enabled: boolean;
};

export const AUTOMATION_DEFAULTS: AutomationSettings = {
  officer_digest_enabled: true,
  birthday_greetings_enabled: true,
  anniversary_greetings_enabled: true,
  dues_reminders_enabled: true,
};

export const AUTOMATION_TOGGLES: { key: keyof AutomationSettings; label: string; description: string }[] = [
  { key: 'officer_digest_enabled', label: 'Weekly officer digest', description: 'A 7-day summary emailed + WhatsApp’d to officers each week.' },
  { key: 'birthday_greetings_enabled', label: 'Birthday greetings', description: 'Daily birthday wishes to members over email + WhatsApp.' },
  { key: 'anniversary_greetings_enabled', label: 'Anniversary greetings', description: 'Daily service-anniversary greetings based on join date.' },
  { key: 'dues_reminders_enabled', label: 'Dues reminders', description: 'Reminders for dues coming due in the next 7 days.' },
];
