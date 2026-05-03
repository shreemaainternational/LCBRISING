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

export interface Member {
  id: string;
  user_id: string | null;
  club_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Club {
  id: string;
  name: string;
  district: string;
  charter_date: string | null;
  city: string | null;
  state: string | null;
  country: string;
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
      events: { Row: Event; Insert: Partial<Event> & Pick<Event, 'title' | 'date'>; Update: Partial<Event> };
      event_rsvps: { Row: EventRSVP; Insert: Partial<EventRSVP> & Pick<EventRSVP, 'event_id'>; Update: Partial<EventRSVP> };
      automation_jobs: { Row: AutomationJob; Insert: Partial<AutomationJob> & Pick<AutomationJob, 'job_type'>; Update: Partial<AutomationJob> };
    };
  };
}
