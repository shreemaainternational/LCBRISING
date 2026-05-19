import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentMember, isAdminRole } from '@/lib/auth';
import { generateClubAgenda, generateZoneAgenda } from '@/lib/ai/meeting-agenda';
import { CLUB_MEETING_TYPES } from '@/templates/meeting-agenda';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ClubBody = z.object({
  kind: z.literal('club'),
  club_name: z.string().min(1).max(200),
  district_name: z.string().min(1).max(200),
  region: z.string().min(1).max(50),
  zone: z.string().min(1).max(50),
  meeting_type: z.enum(CLUB_MEETING_TYPES),
  meeting_date: z.string().min(1).max(50),
  meeting_time: z.string().min(1).max(50),
  venue: z.string().min(1).max(300),
  president_name: z.string().min(1).max(200),
  secretary_name: z.string().min(1).max(200),
  treasurer_name: z.string().min(1).max(200),
  chief_guest: z.string().max(300).optional().or(z.literal('')),
  meeting_theme: z.string().min(1).max(300),
  service_focus: z.string().max(500).optional().or(z.literal('')),
  membership_target: z.string().max(200).optional().or(z.literal('')),
  upcoming_projects: z.string().max(1000).optional().or(z.literal('')),
  financial_review: z.string().max(1000).optional().or(z.literal('')),
  digital_reporting: z.string().max(1000).optional().or(z.literal('')),
  awards_recognition: z.string().max(1000).optional().or(z.literal('')),
  sponsorship_topics: z.string().max(1000).optional().or(z.literal('')),
  csr_activities: z.string().max(1000).optional().or(z.literal('')),
  emergency_matters: z.string().max(1000).optional().or(z.literal('')),
  lions_intl_updates: z.string().max(1000).optional().or(z.literal('')),
});

const ZoneBody = z.object({
  kind: z.literal('zone'),
  district_name: z.string().min(1).max(200),
  region_number: z.string().min(1).max(50),
  zone_number: z.string().min(1).max(50),
  zone_chairperson: z.string().min(1).max(200),
  region_chairperson: z.string().min(1).max(200),
  district_governor: z.string().min(1).max(200),
  meeting_date: z.string().min(1).max(50),
  meeting_time: z.string().min(1).max(50),
  venue: z.string().min(1).max(300),
  host_club: z.string().min(1).max(200),
  participating_clubs: z.string().min(1).max(2000),
  chief_guest: z.string().max(300).optional().or(z.literal('')),
  meeting_theme: z.string().min(1).max(300),
  membership_targets: z.string().max(500).optional().or(z.literal('')),
  service_targets: z.string().max(500).optional().or(z.literal('')),
  lcif_goals: z.string().max(500).optional().or(z.literal('')),
  leadership_topics: z.string().max(1000).optional().or(z.literal('')),
  reporting_topics: z.string().max(1000).optional().or(z.literal('')),
  training_topics: z.string().max(1000).optional().or(z.literal('')),
  digital_topics: z.string().max(1000).optional().or(z.literal('')),
  awards_recognition: z.string().max(1000).optional().or(z.literal('')),
  club_performance_notes: z.string().max(2000).optional().or(z.literal('')),
  upcoming_district_events: z.string().max(2000).optional().or(z.literal('')),
});

const Body = z.discriminatedUnion('kind', [ClubBody, ZoneBody]);

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!isAdminRole(member.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', detail: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.kind === 'club') {
    const { kind: _kind, ...input } = parsed.data;
    void _kind;
    const result = await generateClubAgenda(input);
    return NextResponse.json({ ok: true, ...result });
  }
  const { kind: _kind, ...input } = parsed.data;
  void _kind;
  const result = await generateZoneAgenda(input);
  return NextResponse.json({ ok: true, ...result });
}
