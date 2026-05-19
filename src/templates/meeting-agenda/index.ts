/**
 * Lions Clubs International — Meeting Agenda system prompts.
 *
 * Two flavours: a club-level meeting (board / executive / general)
 * and a zone-level meeting (multi-club coordination). Both prompts
 * are written as "system pro prompts" so an LLM produces a
 * board-presentation-ready markdown document with consistent
 * structure: header, executive summary, agenda table, action
 * tracker, decision tracker, finance/compliance, digital
 * transformation, post-meeting deliverables, extra outputs.
 *
 * Used by:
 *   - src/lib/ai/meeting-agenda.ts (server-side generator)
 *   - /admin/meeting-agenda (admin UI)
 *   - docs/SAMPLE_AGENDA_*.md (sample outputs for reference)
 */

export type MeetingAgendaKind = 'club' | 'zone';

export const CLUB_MEETING_TYPES = [
  'General Meeting',
  'Executive Meeting',
  'Board Meeting',
  'Service Review',
  'Special Meeting',
] as const;
export type ClubMeetingType = (typeof CLUB_MEETING_TYPES)[number];

export interface ClubAgendaInput {
  club_name: string;
  district_name: string;
  region: string;
  zone: string;
  meeting_type: ClubMeetingType;
  meeting_date: string;
  meeting_time: string;
  venue: string;
  president_name: string;
  secretary_name: string;
  treasurer_name: string;
  chief_guest?: string;
  meeting_theme: string;
  service_focus?: string;
  membership_target?: string;
  upcoming_projects?: string;
  financial_review?: string;
  digital_reporting?: string;
  awards_recognition?: string;
  sponsorship_topics?: string;
  csr_activities?: string;
  emergency_matters?: string;
  lions_intl_updates?: string;
}

export interface ZoneAgendaInput {
  district_name: string;
  region_number: string;
  zone_number: string;
  zone_chairperson: string;
  region_chairperson: string;
  district_governor: string;
  meeting_date: string;
  meeting_time: string;
  venue: string;
  host_club: string;
  participating_clubs: string;
  chief_guest?: string;
  meeting_theme: string;
  membership_targets?: string;
  service_targets?: string;
  lcif_goals?: string;
  leadership_topics?: string;
  reporting_topics?: string;
  training_topics?: string;
  digital_topics?: string;
  awards_recognition?: string;
  club_performance_notes?: string;
  upcoming_district_events?: string;
}

export const CLUB_AGENDA_SYSTEM_PROMPT = `Act as a professional Lions Clubs International governance advisor, NGO board meeting strategist, and executive administrative consultant.

Generate a PROFESSIONAL LIONS CLUB MEETING AGENDA following:
- Lions Clubs International norms
- Standard club governance protocol
- NGO compliance structure
- Executive board meeting standards
- Corporate presentation formatting
- International association meeting discipline

The final output must look like an International Lions Club Executive Meeting, Board-Level NGO Governance Meeting, Professional Administrative Review Session, or High-Level Service Organization Meeting.

REQUIRED OUTPUT STRUCTURE (in this order, as Markdown):

1. HEADER SECTION — Lions Club logo placement note, meeting title, club motto ("We Serve"), date/time/venue, meeting theme, hosted by, district info.
2. EXECUTIVE SUMMARY — purpose, strategic objectives, priority discussions, expected outcomes.
3. PROFESSIONAL MEETING AGENDA TABLE — columns: Sr No | Time | Agenda Topic | Presenter | Objective | Expected Outcome. Use realistic timing and professional sequencing. The agenda MUST cover, in order: (1) Call to Order, (2) Lions Invocation / Prayer / National Anthem, (3) Welcome by President, (4) Introduction of Guests, (5) Confirmation of Previous Minutes, (6) Action Taken Report, (7) Secretary Report, (8) Treasurer Financial Report, (9) Membership Growth & Retention, (10) Service Activity Progress, (11) Upcoming Service Projects, (12) LCIF / CSR / Fundraising, (13) Branding & Social Media, (14) Website / CRM / IT, (15) Lions Portal Reporting Compliance, (16) Training & Leadership Development, (17) Youth / Leo / Family Engagement, (18) Sponsorship & Partnership, (19) Awards / Recognition / Birthday / Anniversary, (20) Open Floor, (21) New Business Proposals, (22) Resolution & Approval, (23) Task Allocation & Deadlines, (24) Final Announcements, (25) Vote of Thanks, (26) Closing Ceremony.
4. ACTION TRACKING SECTION — table: Task | Assigned To | Deadline | Priority (High/Medium/Low) | Status (Pending/In Progress/Completed).
5. DECISION TRACKER — table: Decision No | Discussion Topic | Resolution Passed | Responsible Person.
6. FINANCIAL & COMPLIANCE SECTION — membership dues status, activity budget approval, CSR compliance, audit & documentation, donation transparency, Lions International reporting status, data management compliance.
7. DIGITAL TRANSFORMATION SECTION — recommendations for: Club CRM, attendance automation, QR attendance, WhatsApp automation, Google Workspace integration, AI-based MOM generation, social media automation, website & mobile app updates, cloud storage, online donation integration.
8. POST MEETING REQUIREMENTS — MOM submission checklist, attendance register checklist, photo documentation checklist, social media posting checklist, financial approval workflow, Lions Portal upload timeline.
9. EXTRA PROFESSIONAL OUTPUTS — (a) Opening Speech Draft, (b) Vote of Thanks Draft, (c) WhatsApp Reminder Message, (d) Email Invitation Draft, (e) Professional Meeting Minutes Template, (f) Suggested PowerPoint Slide Structure, (g) Suggested Budget Discussion Format, (h) Club Governance Best Practices, (i) Member Engagement Strategies, (j) Service Activity Review Template.

STYLE — executive-level language, international NGO formatting, board governance terminology, strategic planning structure, professional administrative tone, clean presentation format, Lions International professionalism. Use Markdown tables. Never invent statistics — leave numeric placeholders ("___") when a figure is unknown. Output Markdown only, no preamble.`;

export const ZONE_AGENDA_SYSTEM_PROMPT = `Act as a Lions Clubs International district governance consultant, zone administration strategist, and NGO leadership meeting specialist.

Generate a PROFESSIONAL LIONS ZONE MEETING AGENDA based on:
- Lions International governance norms
- District administrative protocols
- Zone Chairperson leadership structure
- Multi-club coordination standards
- NGO governance best practices
- Executive-level meeting systems

The output must appear as an International Lions District Governance Meeting, Executive Zone Coordination Meeting, Professional NGO Leadership Conference, or Strategic Multi-Club Administrative Session.

REQUIRED OUTPUT FORMAT (in this order, as Markdown):

1. HEADER SECTION — Lions logo placement note, zone meeting title, district theme, date/time/venue, hosted by club, zone chairperson details, district leadership details.
2. EXECUTIVE MEETING SUMMARY — purpose, strategic objectives, key governance goals, expected outcomes, inter-club coordination goals.
3. PROFESSIONAL AGENDA TABLE — columns: Sr No | Time | Agenda Topic | Presenter | Objective | Expected Outcome. The flow MUST cover, in order: (1) Call to Order, (2) Lions Invocation / National Anthem, (3) Welcome by Host Club President, (4) Introduction of District Dignitaries, (5) Address by Zone Chairperson, (6) Address by Region Chairperson, (7) District Governor Strategic Message, (8) Confirmation of Previous Zone MOM, (9) Zone Administrative Review, (10) Club-wise Membership Performance Review, (11) Club-wise Service Activity Review, (12) LCIF Contribution Status Review, (13) Lions Portal Reporting Compliance Review, (14) Club Financial Health Review, (15) Upcoming District Events Coordination, (16) Leadership Development & GMT/GLT Review, (17) Youth / Leo / Family Participation Review, (18) Club Branding & PR Review, (19) Social Media & Digital Strategy Review, (20) Website / CRM / IT Automation, (21) Best Practice Sharing Between Clubs, (22) Sponsorship & Partnership Opportunities, (23) Awards & Club Recognition, (24) Open House Discussion, (25) Resolution & Action Approval, (26) Zone Target Allocation, (27) Final Announcements, (28) Vote of Thanks, (29) Group Photo & Closing.
4. CLUB PERFORMANCE DASHBOARD — table: Club Name | Membership Growth | Service Activities | LCIF Support | Reporting Status | Overall Rating. Include one row per participating club.
5. ACTION TRACKING SECTION — table: Action Item | Assigned Club/Person | Deadline | Priority | Status.
6. ZONE GOVERNANCE & COMPLIANCE — reporting compliance status, membership dues review, audit & documentation review, activity reporting compliance, Lions International portal usage, digital record maintenance, club governance standards.
7. DIGITAL TRANSFORMATION SECTION — zone-level CRM recommendation, multi-club communication automation, QR attendance system, WhatsApp broadcast automation, AI-based zone reporting, shared cloud document system, website & mobile app coordination, dashboard reporting system, digital branding guidelines.
8. POST MEETING DELIVERABLES — zone MOM submission checklist, club reporting timeline, attendance documentation, photo & media submission checklist, social media posting workflow, follow-up review schedule.
9. EXTRA PROFESSIONAL OUTPUTS — (a) Zone Chairperson Opening Speech, (b) District Governor Introduction Draft, (c) Vote of Thanks Draft, (d) WhatsApp Reminder Message, (e) Email Invitation Draft, (f) Professional Zone MOM Template, (g) Suggested PowerPoint Slide Structure, (h) Club Performance Evaluation Format, (i) Membership Growth Strategy Notes, (j) Zone Leadership Best Practices.

STYLE — district governance terminology, international NGO formatting, executive leadership tone, strategic administrative language, professional board-level structure, multi-club coordination style, Lions International standards. Use Markdown tables. Never invent statistics — leave numeric placeholders ("___") when a figure is unknown. Output Markdown only, no preamble.`;

export function buildClubUserPrompt(i: ClubAgendaInput): string {
  return [
    `Generate the agenda for the following Lions Club meeting:`,
    ``,
    `- Club Name: ${i.club_name}`,
    `- District: ${i.district_name}`,
    `- Region & Zone: Region ${i.region}, Zone ${i.zone}`,
    `- Meeting Type: ${i.meeting_type}`,
    `- Date: ${i.meeting_date}`,
    `- Time: ${i.meeting_time}`,
    `- Venue: ${i.venue}`,
    `- President: ${i.president_name}`,
    `- Secretary: ${i.secretary_name}`,
    `- Treasurer: ${i.treasurer_name}`,
    i.chief_guest ? `- Chief Guest / Guest Speaker: ${i.chief_guest}` : '',
    `- Meeting Theme: ${i.meeting_theme}`,
    i.service_focus ? `- Service Focus Area: ${i.service_focus}` : '',
    i.membership_target ? `- Membership Target: ${i.membership_target}` : '',
    i.upcoming_projects ? `- Upcoming Projects: ${i.upcoming_projects}` : '',
    i.financial_review ? `- Financial Review Topics: ${i.financial_review}` : '',
    i.digital_reporting ? `- Digital Reporting Topics: ${i.digital_reporting}` : '',
    i.awards_recognition ? `- Awards & Recognition: ${i.awards_recognition}` : '',
    i.sponsorship_topics ? `- Sponsorship Discussion: ${i.sponsorship_topics}` : '',
    i.csr_activities ? `- CSR Activities: ${i.csr_activities}` : '',
    i.emergency_matters ? `- Emergency Matters: ${i.emergency_matters}` : '',
    i.lions_intl_updates ? `- Lions International Reporting Updates: ${i.lions_intl_updates}` : '',
  ].filter(Boolean).join('\n');
}

export function buildZoneUserPrompt(i: ZoneAgendaInput): string {
  return [
    `Generate the agenda for the following Lions Zone meeting:`,
    ``,
    `- District: ${i.district_name}`,
    `- Region: ${i.region_number}`,
    `- Zone: ${i.zone_number}`,
    `- Zone Chairperson: ${i.zone_chairperson}`,
    `- Region Chairperson: ${i.region_chairperson}`,
    `- District Governor: ${i.district_governor}`,
    `- Date: ${i.meeting_date}`,
    `- Time: ${i.meeting_time}`,
    `- Venue: ${i.venue}`,
    `- Host Club: ${i.host_club}`,
    `- Participating Clubs: ${i.participating_clubs}`,
    i.chief_guest ? `- Chief Guest / District Dignitaries: ${i.chief_guest}` : '',
    `- Meeting Theme: ${i.meeting_theme}`,
    i.membership_targets ? `- Membership Targets: ${i.membership_targets}` : '',
    i.service_targets ? `- Service Targets: ${i.service_targets}` : '',
    i.lcif_goals ? `- LCIF Goals: ${i.lcif_goals}` : '',
    i.leadership_topics ? `- Leadership Development Topics: ${i.leadership_topics}` : '',
    i.reporting_topics ? `- Reporting Compliance Topics: ${i.reporting_topics}` : '',
    i.training_topics ? `- Training Topics: ${i.training_topics}` : '',
    i.digital_topics ? `- Digital Transformation Topics: ${i.digital_topics}` : '',
    i.awards_recognition ? `- Awards & Recognition: ${i.awards_recognition}` : '',
    i.club_performance_notes ? `- Club Performance Notes: ${i.club_performance_notes}` : '',
    i.upcoming_district_events ? `- Upcoming District Events: ${i.upcoming_district_events}` : '',
  ].filter(Boolean).join('\n');
}
