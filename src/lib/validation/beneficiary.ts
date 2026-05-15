import { z } from 'zod';

export const beneficiarySchema = z.object({
  full_name: z.string().min(1).max(200),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  gender: z.enum(['male','female','other','undisclosed']).optional().nullable(),
  age: z.number().int().min(0).max(120).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  aadhaar_last4: z.string().max(4).optional().nullable(),
  income_category: z.string().max(50).optional().nullable(),
  household_size: z.number().int().min(0).max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  photo_url: z.string().url().optional().nullable().or(z.literal('')),
  family_head: z.string().max(200).optional().nullable(),
  emergency_contact: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  consent_at: z.string().optional().nullable(),
});

export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;

export const beneficiaryServiceSchema = z.object({
  beneficiary_id: z.string().uuid(),
  activity_id: z.string().uuid().optional().nullable(),
  service_date: z.string().optional(),
  service_type: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  value_provided: z.number().min(0).default(0),
  follow_up_required: z.boolean().default(false),
  follow_up_date: z.string().optional().nullable(),
  follow_up_status: z.string().max(100).optional().nullable(),
  medical_report_url: z.string().url().optional().nullable().or(z.literal('')),
});

export type BeneficiaryServiceInput = z.infer<typeof beneficiaryServiceSchema>;
