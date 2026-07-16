// Auto-generated representation of the Supabase schema for type-safe access.
// Re-generate with `pnpm db:types` once the project is connected.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberRole =
  | 'admin'
  | 'president'
  | 'secretary'
  | 'treasurer'
  | 'officer'
  | 'member';

export type MemberStatus = 'active' | 'lapsed' | 'suspended' | 'pending';
export type DuesStatus = 'pending' | 'paid' | 'overdue' | 'waived';
export type PaymentType = 'dues' | 'donation' | 'event' | 'other';
export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
export type RsvpStatus = 'yes' | 'no' | 'maybe';

export type LionsRole =
  | 'international_admin'
  | 'multiple_district_admin'
  | 'district_governor'
  | 'vice_district_governor'
  | 'cabinet_officer'
  | 'region_chairperson'
  | 'zone_chairperson'
  | 'club_president'
  | 'club_secretary'
  | 'club_treasurer'
  | 'club_officer'
  | 'member'
  | 'guest_viewer';

export type OfficerTermStatus = 'active' | 'past' | 'pending';
export type SyncStatus = 'queued' | 'running' | 'success' | 'partial' | 'failed';
export type SyncSourceKind = 'lions_oidc' | 'rest_api' | 'csv' | 'excel' | 'webhook' | 'manual';
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'remote';

export interface Member {
  id: string;
  user_id: string | null;
  club_id: string | null;
  district_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  role: MemberRole;
  lions_role: LionsRole | null;
  lions_member_id: string | null;
  status: MemberStatus;
  birthday: string | null;
  joined_at: string;
  avatar_url: string | null;
  last_sync_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  district: string;
  district_id: string | null;
  zone_id: string | null;
  region_id: string | null;
  club_number: string | null;
  source_id: string | null;
  meeting_schedule: Record<string, unknown> | null;
  charter_date: string | null;
  city: string | null;
  state: string | null;
  country: string;
  deleted_at: string | null;
}

export interface District {
  id: string;
  multiple_district_id: string | null;
  code: string;
  name: string;
  governor_name: string | null;
  cabinet_secretary_name: string | null;
  cabinet_treasurer_name: string | null;
  lions_year: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Officer {
  id: string;
  member_id: string;
  scope_kind: 'club' | 'zone' | 'region' | 'district' | 'multiple_district' | 'international';
  scope_id: string | null;
  role: LionsRole;
  term_start: string;
  term_end: string | null;
  status: OfficerTermStatus;
  appointed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OAuthAccount {
  id: string;
  user_id: string | null;
  member_id: string | null;
  provider: string;
  subject: string;
  email: string | null;
  email_verified: boolean | null;
  raw_profile: Record<string, unknown> | null;
  access_token: string | null;
  refresh_token: string | null;
  id_token: string | null;
  token_type: string | null;
  scope: string | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  source: SyncSourceKind;
  entity: string;
  status: SyncStatus;
  triggered_by: string | null;
  integration_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  records_total: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  cursor: string | null;
  error_message: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_member_id: string | null;
  actor_label: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  payload: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
  created_at: string;
}

export interface Dues {
  id: string;
  member_id: string;
  amount: number;
  currency: string;
  due_date: string;
  period_label: string | null;
  status: DuesStatus;
  paid_at: string | null;
}

export interface Payment {
  id: string;
  member_id: string | null;
  donation_id: string | null;
  dues_id: string | null;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  receipt_no: string | null;
  raw_event: Json | null;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_name: string;
  donor_email: string | null;
  donor_phone: string | null;
  donor_pan: string | null;
  amount: number;
  currency: string;
  campaign: string | null;
  message: string | null;
  is_anonymous: boolean;
  payment_id: string | null;
  receipt_no: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  club_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  beneficiaries: number;
  service_hours: number;
  amount_raised: number;
  date: string;
  location: string | null;
  photos: string[];
  reported_to_district: boolean;
}

export interface ServiceActivity {
  id: string;
  sponsor_md: string | null;
  sponsor_district: string | null;
  sponsor_account_name: string | null;
  sponsor_zone: string | null;
  sponsor_region: string | null;
  sponsor_account_id: string | null;
  sponsor_parent_id: string | null;
  sponsor_parent_parent_id: string | null;
  start_date: string | null;
  end_date: string | null;
  report_complete: boolean;
  status: string | null;
  title: string;
  description: string | null;
  activity_level: string | null;
  cause: string | null;
  project_type: string | null;
  signature_activity: boolean;
  funded_by_lcif_grant: boolean;
  people_served: number;
  people_served_capped: number;
  total_volunteers: number;
  total_volunteer_hours: number;
  total_volunteer_hours_capped: number;
  total_funds_donated: number;
  total_funds_donated_usd_capped: number;
  donation_to_lcif: boolean;
  organization_benefited: string | null;
  total_funds_raised: number;
  total_funds_raised_usd_capped: number;
  trees_planted: number;
  created_by_full_name: string | null;
  service_activity_id: string | null;
  club_id: string | null;
  activity_id: string | null;
  category: string | null;
  source_file: string | null;
  imported_at: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  club_id: string | null;
  title: string;
  description: string | null;
  date: string;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  is_public: boolean;
  cover_url: string | null;
  qr_secret: string;
}

export interface EventRSVP {
  id: string;
  event_id: string;
  member_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  status: RsvpStatus;
  attended_at: string | null;
}

export interface AutomationJob {
  id: string;
  job_type: string;
  payload: Json;
  run_after: string;
  attempts: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  last_error: string | null;
}

export interface Database {
  public: {
    Tables: {
      members: { Row: Member; Insert: Partial<Member> & Pick<Member, 'name' | 'email'>; Update: Partial<Member> };
      clubs: { Row: Club; Insert: Partial<Club> & Pick<Club, 'name' | 'district'>; Update: Partial<Club> };
      dues: { Row: Dues; Insert: Partial<Dues> & Pick<Dues, 'member_id' | 'amount' | 'due_date'>; Update: Partial<Dues> };
      payments: { Row: Payment; Insert: Partial<Payment> & Pick<Payment, 'amount' | 'type'>; Update: Partial<Payment> };
      donations: { Row: Donation; Insert: Partial<Donation> & Pick<Donation, 'donor_name' | 'amount'>; Update: Partial<Donation> };
      activities: { Row: Activity; Insert: Partial<Activity> & Pick<Activity, 'title'>; Update: Partial<Activity> };
      service_activities: { Row: ServiceActivity; Insert: Partial<ServiceActivity> & Pick<ServiceActivity, 'title'>; Update: Partial<ServiceActivity> };
      events: { Row: Event; Insert: Partial<Event> & Pick<Event, 'title' | 'date'>; Update: Partial<Event> };
      event_rsvps: { Row: EventRSVP; Insert: Partial<EventRSVP> & Pick<EventRSVP, 'event_id'>; Update: Partial<EventRSVP> };
      automation_jobs: { Row: AutomationJob; Insert: Partial<AutomationJob> & Pick<AutomationJob, 'job_type'>; Update: Partial<AutomationJob> };
    };
  };
}
