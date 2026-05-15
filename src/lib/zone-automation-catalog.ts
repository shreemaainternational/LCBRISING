export type ZoneAutomationKind =
  | 'low_attendance_advisory'
  | 'missing_activity_reminder'
  | 'weekly_meeting_reminder'
  | 'monthly_report_publish'
  | 'birthday_wishes'
  | 'overdue_dues_nudge'
  | 'csr_partner_check_in'
  | 'new_member_welcome';

export type ZoneAutomationChannel = 'whatsapp' | 'email' | 'sms' | 'push' | 'advisory';

export interface AutomationDef {
  kind: ZoneAutomationKind;
  name: string;
  description: string;
  defaultChannel: ZoneAutomationChannel;
  channels: ZoneAutomationChannel[];
  defaultCadence: string;
  configFields?: { key: string; label: string; type: 'number' | 'text'; defaultValue: number | string; hint?: string }[];
  preview: string;
}

export const ZONE_AUTOMATION_CATALOG: AutomationDef[] = [
  {
    kind: 'low_attendance_advisory',
    name: 'Low-attendance advisory',
    description: 'When any club\'s 60-day attendance drops below a threshold, automatically file an advisory.',
    defaultChannel: 'advisory',
    channels: ['advisory', 'email', 'whatsapp'],
    defaultCadence: 'weekly:mon@09:00',
    configFields: [
      { key: 'threshold_pct', label: 'Attendance threshold (%)', type: 'number', defaultValue: 30, hint: 'Trigger when below this' },
      { key: 'window_days',   label: 'Look-back window (days)',  type: 'number', defaultValue: 60 },
    ],
    preview: 'Hi Club Secretary — your 60-day attendance is below 30%. Action required.',
  },
  {
    kind: 'missing_activity_reminder',
    name: 'Missing-activity reminder',
    description: 'Nudge clubs that haven\'t logged a service activity in N days.',
    defaultChannel: 'whatsapp',
    channels: ['advisory', 'whatsapp', 'email'],
    defaultCadence: 'weekly:wed@10:00',
    configFields: [
      { key: 'silent_days', label: 'Silent days', type: 'number', defaultValue: 30 },
    ],
    preview: 'Your club hasn\'t logged an activity in 30+ days — file one today!',
  },
  {
    kind: 'weekly_meeting_reminder',
    name: 'Weekly meeting reminder',
    description: 'Auto-send the next upcoming agenda item as a reminder every Monday.',
    defaultChannel: 'whatsapp',
    channels: ['whatsapp', 'email', 'push'],
    defaultCadence: 'weekly:mon@08:00',
    preview: 'Heads up — Zone Cabinet Meeting on Wed 10am at LCBRS Hall.',
  },
  {
    kind: 'monthly_report_publish',
    name: 'Monthly report auto-publish',
    description: 'On the 1st of every month, generate the monthly zone report and email the chair.',
    defaultChannel: 'email',
    channels: ['email'],
    defaultCadence: 'monthly:1@06:00',
    preview: 'Your zone\'s monthly report is ready. Download attached PDF + PPTX.',
  },
  {
    kind: 'birthday_wishes',
    name: 'Birthday wishes',
    description: 'Daily check — send birthday wishes to members and Leos.',
    defaultChannel: 'whatsapp',
    channels: ['whatsapp', 'email', 'push'],
    defaultCadence: 'daily:08:00',
    preview: 'Wishing Lion X a very happy birthday from the Zone!',
  },
  {
    kind: 'overdue_dues_nudge',
    name: 'Overdue dues nudge',
    description: 'When a member\'s dues are overdue past a grace period, send a friendly nudge.',
    defaultChannel: 'email',
    channels: ['email', 'whatsapp', 'sms'],
    defaultCadence: 'weekly:fri@10:00',
    configFields: [
      { key: 'grace_days', label: 'Grace period (days)', type: 'number', defaultValue: 7 },
    ],
    preview: 'Friendly reminder — your dues for the period are 7+ days overdue.',
  },
  {
    kind: 'csr_partner_check_in',
    name: 'CSR partner check-in',
    description: 'Quarterly relationship-touch — gently re-engage CSR donors.',
    defaultChannel: 'email',
    channels: ['email'],
    defaultCadence: 'monthly:1@09:00',
    preview: 'Thank you for your continued partnership. Here\'s the latest impact from your contributions.',
  },
  {
    kind: 'new_member_welcome',
    name: 'New member welcome',
    description: 'When a new member is added, auto-send a welcome message and onboarding link.',
    defaultChannel: 'email',
    channels: ['email', 'whatsapp', 'push'],
    defaultCadence: 'event:on_member_create',
    preview: 'Welcome to the Lions family! Here\'s everything you need to get started.',
  },
];

export function findAutomation(kind: ZoneAutomationKind): AutomationDef | undefined {
  return ZONE_AUTOMATION_CATALOG.find((a) => a.kind === kind);
}
