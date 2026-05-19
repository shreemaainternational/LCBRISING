/**
 * Lions meeting agenda generator.
 *
 * Calls OpenAI (chat completions) with the canonical "Lions Club" /
 * "Lions Zone" system prompts in src/templates/meeting-agenda. Falls
 * back to a hand-written deterministic agenda when OpenAI is unset or
 * unreachable, so the admin always gets a usable document — same
 * pattern as src/lib/ai/openai.ts.
 */

import { loadOpenAiConfig } from './openai-config';
import {
  CLUB_AGENDA_SYSTEM_PROMPT,
  ZONE_AGENDA_SYSTEM_PROMPT,
  buildClubUserPrompt,
  buildZoneUserPrompt,
  type ClubAgendaInput,
  type ZoneAgendaInput,
} from '@/templates/meeting-agenda';

export interface MeetingAgendaResult {
  markdown: string;
  source: 'ai' | 'template';
  ai_error?: string;
  usage: { prompt_tokens: number; completion_tokens: number; cost_usd: number };
}

export async function generateClubAgenda(input: ClubAgendaInput): Promise<MeetingAgendaResult> {
  return generate(CLUB_AGENDA_SYSTEM_PROMPT, buildClubUserPrompt(input), () => fallbackClubAgenda(input));
}

export async function generateZoneAgenda(input: ZoneAgendaInput): Promise<MeetingAgendaResult> {
  return generate(ZONE_AGENDA_SYSTEM_PROMPT, buildZoneUserPrompt(input), () => fallbackZoneAgenda(input));
}

async function generate(
  system: string,
  user: string,
  fallback: () => string,
): Promise<MeetingAgendaResult> {
  const cfg = await loadOpenAiConfig();
  if (!cfg) {
    return {
      markdown: fallback(),
      source: 'template',
      usage: { prompt_tokens: 0, completion_tokens: 0, cost_usd: 0 },
    };
  }
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return {
        markdown: fallback(),
        source: 'template',
        ai_error: `OpenAI ${res.status}: ${txt.slice(0, 200)}`,
        usage: { prompt_tokens: 0, completion_tokens: 0, cost_usd: 0 },
      };
    }
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
    };
    const markdown = json.choices?.[0]?.message?.content?.trim() || fallback();
    return {
      markdown,
      source: 'ai',
      usage: {
        prompt_tokens: json.usage?.prompt_tokens ?? 0,
        completion_tokens: json.usage?.completion_tokens ?? 0,
        cost_usd: estimateCost(cfg.model, json.usage?.prompt_tokens ?? 0, json.usage?.completion_tokens ?? 0),
      },
    };
  } catch (e) {
    return {
      markdown: fallback(),
      source: 'template',
      ai_error: (e as Error).message,
      usage: { prompt_tokens: 0, completion_tokens: 0, cost_usd: 0 },
    };
  }
}

// ----- pricing (USD per 1K tokens) ---------------------------------
const PRICES: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.00015, out: 0.00060 },
  'gpt-4o':      { in: 0.00500, out: 0.01500 },
  'gpt-4-turbo': { in: 0.01000, out: 0.03000 },
};
function estimateCost(model: string, pin: number, pout: number) {
  const p = PRICES[model] ?? PRICES['gpt-4o-mini'];
  return (pin / 1000) * p.in + (pout / 1000) * p.out;
}

// ----- fallback agendas --------------------------------------------
// Generated deterministically from the same input fields the LLM
// would see. Tables follow the structure in the system prompt so the
// document is presentation-ready even with no API key.

const TIME_SLOTS_CLUB = [
  '18:00', '18:05', '18:10', '18:15', '18:25', '18:30',
  '18:40', '18:50', '19:00', '19:10', '19:20', '19:30',
  '19:40', '19:50', '20:00', '20:05', '20:15', '20:25',
  '20:35', '20:45', '20:55', '21:00', '21:10', '21:20',
  '21:25', '21:30',
];

const CLUB_FLOW: Array<{ topic: string; presenter: (i: ClubAgendaInput) => string; objective: string; outcome: string }> = [
  { topic: 'Call Meeting to Order', presenter: i => `President ${i.president_name}`, objective: 'Formally open the session', outcome: 'Quorum confirmed' },
  { topic: 'Lions Invocation / Prayer / National Anthem', presenter: () => 'Tail Twister', objective: 'Set the tone for service', outcome: 'Members aligned' },
  { topic: 'Welcome Address by President', presenter: i => `President ${i.president_name}`, objective: 'Frame meeting theme', outcome: 'Theme communicated' },
  { topic: 'Introduction of Guests', presenter: i => `Secretary ${i.secretary_name}`, objective: 'Acknowledge guests / Chief Guest', outcome: 'Guests welcomed' },
  { topic: 'Confirmation of Previous Minutes', presenter: i => `Secretary ${i.secretary_name}`, objective: 'Approve prior MOM', outcome: 'Minutes ratified' },
  { topic: 'Action Taken Report', presenter: i => `Secretary ${i.secretary_name}`, objective: 'Review prior actions', outcome: 'Status updated' },
  { topic: 'Secretary Report', presenter: i => `Secretary ${i.secretary_name}`, objective: 'Operational update', outcome: 'Members informed' },
  { topic: 'Treasurer Financial Report', presenter: i => `Treasurer ${i.treasurer_name}`, objective: 'Review club finances', outcome: 'Statement approved' },
  { topic: 'Membership Growth & Retention Review', presenter: () => 'Membership Chair', objective: 'Track new / retained members', outcome: 'Growth plan refined' },
  { topic: 'Service Activity Progress Review', presenter: () => 'Service Chair', objective: 'Review ongoing projects', outcome: 'Gaps identified' },
  { topic: 'Upcoming Service Projects', presenter: () => 'Service Chair', objective: 'Plan next quarter activities', outcome: 'Projects approved' },
  { topic: 'LCIF / CSR / Fundraising Discussion', presenter: () => 'LCIF Coordinator', objective: 'Mobilise contributions', outcome: 'Targets committed' },
  { topic: 'Club Branding & Social Media Update', presenter: () => 'PRO / Branding Chair', objective: 'Review reach & engagement', outcome: 'Calendar approved' },
  { topic: 'Website / CRM / IT System Update', presenter: () => 'IT Chair', objective: 'Review digital systems', outcome: 'Tickets prioritised' },
  { topic: 'Lions Portal Reporting Compliance', presenter: i => `Secretary ${i.secretary_name}`, objective: 'Ensure MyLion / Lions Portal up to date', outcome: 'Reports filed' },
  { topic: 'Training & Leadership Development', presenter: () => 'GLT / Training Chair', objective: 'Plan member training', outcome: 'Cohort scheduled' },
  { topic: 'Youth / Leo / Family Engagement Review', presenter: () => 'Leo / Family Chair', objective: 'Track Leo & family programs', outcome: 'Engagement boosted' },
  { topic: 'Sponsorship & Partnership Discussion', presenter: i => `President ${i.president_name}`, objective: 'Review sponsor pipeline', outcome: 'Partnerships advanced' },
  { topic: 'Awards / Recognition / Birthday / Anniversary', presenter: () => 'Tail Twister', objective: 'Recognise members', outcome: 'Morale boosted' },
  { topic: 'Open Floor Discussion', presenter: i => `President ${i.president_name}`, objective: 'Surface member input', outcome: 'Concerns captured' },
  { topic: 'New Business Proposals', presenter: () => 'Any Member', objective: 'Introduce new initiatives', outcome: 'Items tabled' },
  { topic: 'Resolution & Approval Section', presenter: i => `President ${i.president_name}`, objective: 'Vote on resolutions', outcome: 'Resolutions passed' },
  { topic: 'Task Allocation & Deadlines', presenter: i => `Secretary ${i.secretary_name}`, objective: 'Assign accountable owners', outcome: 'Action tracker updated' },
  { topic: 'Final Announcements', presenter: i => `Secretary ${i.secretary_name}`, objective: 'Share upcoming dates', outcome: 'Calendar shared' },
  { topic: 'Vote of Thanks', presenter: () => 'Designated Member', objective: 'Close on a note of gratitude', outcome: 'Members acknowledged' },
  { topic: 'Closing Ceremony', presenter: i => `President ${i.president_name}`, objective: 'Formally close meeting', outcome: 'Meeting adjourned' },
];

function fallbackClubAgenda(i: ClubAgendaInput): string {
  const headerNote = '<!-- Place club logo at top-left, Lions International logo at top-right -->';
  const agendaRows = CLUB_FLOW.map((row, idx) => {
    const t = TIME_SLOTS_CLUB[idx] ?? '—';
    return `| ${idx + 1} | ${t} | ${row.topic} | ${row.presenter(i)} | ${row.objective} | ${row.outcome} |`;
  }).join('\n');

  return `${headerNote}

# 🦁 ${i.club_name}
## ${i.meeting_type} — ${i.meeting_date}
**Motto:** "We Serve" · **District:** ${i.district_name} · **Region ${i.region}, Zone ${i.zone}**

| | |
|---|---|
| **Date** | ${i.meeting_date} |
| **Time** | ${i.meeting_time} |
| **Venue** | ${i.venue} |
| **Theme** | ${i.meeting_theme} |
| **Hosted By** | ${i.club_name} |
${i.chief_guest ? `| **Chief Guest** | ${i.chief_guest} |\n` : ''}
---

## Executive Summary

- **Purpose:** Conduct the ${i.meeting_type.toLowerCase()} of ${i.club_name} aligned to the theme "${i.meeting_theme}".
- **Strategic Objectives:** review service progress, strengthen membership${i.membership_target ? ` (target: ${i.membership_target})` : ''}, ensure Lions Portal compliance, approve upcoming projects.
- **Priority Discussions:** ${[i.service_focus, i.financial_review, i.upcoming_projects, i.csr_activities].filter(Boolean).join('; ') || 'service delivery, finance, membership, reporting'}.
- **Expected Outcomes:** approved minutes, ratified financials, assigned action items, signed-off project plans, updated MyLion / Lions Portal reports.

---

## Professional Meeting Agenda

| Sr No | Time | Agenda Topic | Presenter | Objective | Expected Outcome |
|---|---|---|---|---|---|
${agendaRows}

---

## Action Tracking

| Task | Assigned To | Deadline | Priority | Status |
|---|---|---|---|---|
| Circulate signed minutes | Secretary ${i.secretary_name} | T+3 days | High | Pending |
| File MyLion / Lions Portal activity report | Secretary ${i.secretary_name} | T+7 days | High | Pending |
| Publish meeting recap on social media | PRO / Branding Chair | T+2 days | Medium | Pending |
| Confirm next service project schedule | Service Chair | T+5 days | High | Pending |
| Update CRM with attendance & decisions | IT Chair | T+1 day | Medium | Pending |

---

## Decision Tracker

| Decision No | Discussion Topic | Resolution Passed | Responsible Person |
|---|---|---|---|
| 01 | Approval of previous minutes | Ratified as circulated | Secretary ${i.secretary_name} |
| 02 | Treasurer's financial report | Approved subject to audit | Treasurer ${i.treasurer_name} |
| 03 | Upcoming service project | Approved with budget cap | Service Chair |
| 04 | LCIF / CSR contribution drive | Approved at agreed contribution level | LCIF Coordinator |
| 05 | Lions Portal compliance plan | Approved monthly cadence | Secretary ${i.secretary_name} |

---

## Financial & Compliance

- **Membership dues status:** ___ % collected · arrears reviewed.
- **Activity budget approval:** ${i.financial_review ?? 'review activity-wise budgets and approve disbursements'}.
- **CSR compliance:** ${i.csr_activities ?? 'maintain donor MOUs, beneficiary records, utilisation certificates'}.
- **Audit & documentation:** review last audit findings; close open items.
- **Donation transparency:** Razorpay / UPI receipts issued; 80G receipts dispatched.
- **Lions International reporting status:** MyLion activities + service hours filed; District reports on time.
- **Data management compliance:** member PII protected; backups verified; access roles reviewed.

---

## Digital Transformation

- **Club CRM:** keep member, dues, donations, activities synced.
- **Attendance automation:** QR check-in at venue; sync to CRM.
- **WhatsApp communication:** broadcast pre-/post-meeting using approved templates.
- **Google Workspace:** shared drive for minutes, attendance, photos.
- **AI-based MOM:** auto-draft minutes from notes; review and sign off.
- **Social media automation:** scheduled posts pre- and post-meeting.
- **Website & mobile app:** publish meeting recap, photos, service stories.
- **Cloud storage:** all artefacts archived with retention policy.
- **Online donations:** UPI / Razorpay links printed on receipts.

---

## Post Meeting Requirements

- [ ] MOM drafted, reviewed, signed, archived (T+3 days).
- [ ] Attendance register reconciled with QR check-in (T+1 day).
- [ ] Photo documentation uploaded to cloud + media library (T+2 days).
- [ ] Social media recap posted on FB / Instagram / LinkedIn (T+2 days).
- [ ] Financial approvals routed via Treasurer ${i.treasurer_name} (T+5 days).
- [ ] Lions Portal / MyLion service-activity upload (T+7 days).

---

## Extra Professional Outputs

### 1. Opening Speech (Draft)
Fellow Lions, distinguished guests, ladies and gentlemen — it is my privilege to call to order this ${i.meeting_type.toLowerCase()} of ${i.club_name}. Under the theme "${i.meeting_theme}", we gather today not merely to transact business but to renew our pledge to the motto that binds every Lion across 200+ countries: **We Serve.** Let us proceed with discipline, with purpose, and with the unwavering conviction that every decision taken in this room must translate into measurable service for our community.

### 2. Vote of Thanks (Draft)
On behalf of ${i.club_name}, I extend our heartfelt thanks to our President, Secretary, Treasurer, every member who contributed today${i.chief_guest ? `, and most especially to our Chief Guest ${i.chief_guest}` : ''}. Your time, your wisdom, and your commitment fuel the service engine of this club. Thank you, and We Serve.

### 3. WhatsApp Reminder
🦁 *${i.club_name}* — ${i.meeting_type}
📅 ${i.meeting_date} · 🕒 ${i.meeting_time}
📍 ${i.venue}
*Theme:* ${i.meeting_theme}
Kindly confirm attendance. *We Serve.*

### 4. Email Invitation (Draft)
**Subject:** ${i.meeting_type} — ${i.club_name} — ${i.meeting_date}

Dear Lion,

You are cordially invited to the ${i.meeting_type} of ${i.club_name} on ${i.meeting_date} at ${i.meeting_time} at ${i.venue}. The meeting will be conducted under the theme "${i.meeting_theme}". The agenda is attached for your reference.

Your presence will lend strength to our deliberations.

Yours in service,
**${i.president_name}**, Club President
${i.club_name} · ${i.district_name}

### 5. Professional Meeting Minutes Template
\`\`\`
${i.club_name} — ${i.meeting_type}
Date: ${i.meeting_date} | Time: ${i.meeting_time} | Venue: ${i.venue}
Chair: ${i.president_name} | Secretary: ${i.secretary_name}
Attendance: ___ members present, ___ guests, ___ apologies

1. Call to Order — ${i.president_name}
2. Invocation — _______
3. Welcome Address — ${i.president_name}
4. Introduction of Guests — ${i.secretary_name}
5. Previous Minutes — Ratified / Amended
6. Action Taken Report — Status updates
7. Secretary Report — Key items
8. Treasurer Report — Opening balance / receipts / payments / closing balance
... (continue for each agenda item)

Decisions: see Decision Tracker
Actions: see Action Tracker
Next Meeting: ____
Closed at: ____ by ${i.president_name}
\`\`\`

### 6. Suggested PowerPoint Slide Structure
1. Cover — Club logo, theme, date.
2. Agenda overview.
3. Membership dashboard.
4. Service activity highlights.
5. Financial snapshot.
6. LCIF / CSR progress.
7. Lions Portal compliance.
8. Upcoming projects.
9. Resolutions tabled.
10. Closing — thank-you + next meeting.

### 7. Suggested Budget Discussion Format
- Opening balance · Receipts (dues, donations, sponsorships) · Payments (activities, admin, LCIF) · Closing balance · Variance vs plan · Approvals required.

### 8. Club Governance Best Practices
- Conduct meetings monthly with quorum discipline.
- Publish minutes within 3 days; archive 3 years.
- Maintain a documented succession plan.
- Rotate sub-committee chairs annually.
- Conduct an internal audit half-yearly.

### 9. Member Engagement Strategies
- Personalised birthday / anniversary recognition.
- Monthly service spotlight on social media.
- Family + Leo participation in service activities.
- Skills-based volunteering matched to member strengths.

### 10. Service Activity Review Template
| Activity | Beneficiaries | Hours | Funds Used | LCIF Tie-in | Status |
|---|---|---|---|---|---|
| ${i.service_focus ?? '___'} | ___ | ___ | ₹ ___ | ___ | Planned / Ongoing / Done |
`;
}

// ----- Zone fallback -----------------------------------------------

const TIME_SLOTS_ZONE = [
  '10:00', '10:05', '10:10', '10:20', '10:30',
  '10:40', '10:55', '11:10', '11:25', '11:40',
  '11:55', '12:10', '12:25', '12:40', '12:55',
  '13:10', '13:25', '13:35', '13:45', '13:55',
  '14:10', '14:25', '14:35', '14:50', '15:00',
  '15:10', '15:20', '15:25', '15:30',
];

const ZONE_FLOW: Array<{ topic: string; presenter: (i: ZoneAgendaInput) => string; objective: string; outcome: string }> = [
  { topic: 'Call to Order', presenter: i => `Zone Chairperson ${i.zone_chairperson}`, objective: 'Open the session', outcome: 'Quorum confirmed' },
  { topic: 'Lions Invocation / National Anthem', presenter: () => 'Host Club Tail Twister', objective: 'Set the tone', outcome: 'Members aligned' },
  { topic: 'Welcome by Host Club President', presenter: i => `${i.host_club} President`, objective: 'Welcome dignitaries & delegates', outcome: 'Guests acknowledged' },
  { topic: 'Introduction of District Dignitaries', presenter: i => `Zone Chairperson ${i.zone_chairperson}`, objective: 'Introduce DG / cabinet', outcome: 'Dignitaries honoured' },
  { topic: 'Address by Zone Chairperson', presenter: i => `Zone Chairperson ${i.zone_chairperson}`, objective: 'Set zone agenda', outcome: 'Direction shared' },
  { topic: 'Address by Region Chairperson', presenter: i => `Region Chairperson ${i.region_chairperson}`, objective: 'Convey region priorities', outcome: 'Alignment achieved' },
  { topic: 'District Governor Strategic Message', presenter: i => `District Governor ${i.district_governor}`, objective: 'Cast district vision', outcome: 'Year goals reiterated' },
  { topic: 'Confirmation of Previous Zone MOM', presenter: () => 'Zone Secretary', objective: 'Ratify prior minutes', outcome: 'Minutes confirmed' },
  { topic: 'Zone Administrative Review', presenter: i => `Zone Chairperson ${i.zone_chairperson}`, objective: 'Review zone operations', outcome: 'Gaps surfaced' },
  { topic: 'Club-wise Membership Performance Review', presenter: () => 'Zone GMT', objective: 'Track growth & retention', outcome: 'Action items per club' },
  { topic: 'Club-wise Service Activity Review', presenter: () => 'Zone Service Chair', objective: 'Compare service KPIs', outcome: 'Best practices noted' },
  { topic: 'LCIF Contribution Status Review', presenter: () => 'Zone LCIF Coordinator', objective: 'Track LCIF pledges', outcome: 'Pledges escalated' },
  { topic: 'Lions Portal Reporting Compliance Review', presenter: () => 'Zone Reporting Officer', objective: 'Audit MyLion compliance', outcome: 'Non-compliant clubs flagged' },
  { topic: 'Club Financial Health Review', presenter: () => 'Zone Treasurer', objective: 'Inspect dues, arrears, audits', outcome: 'Health rating set' },
  { topic: 'Upcoming District Events Coordination', presenter: i => `District Governor ${i.district_governor}`, objective: 'Align zone participation', outcome: 'Quotas committed' },
  { topic: 'Leadership Development & GMT / GLT Review', presenter: () => 'Zone GLT', objective: 'Plan training & succession', outcome: 'Pipeline mapped' },
  { topic: 'Youth / Leo / Family Participation Review', presenter: () => 'Zone Leo Chair', objective: 'Strengthen youth pipeline', outcome: 'Leo growth plan' },
  { topic: 'Club Branding & PR Review', presenter: () => 'Zone PRO', objective: 'Standardise branding', outcome: 'Brand guidelines shared' },
  { topic: 'Social Media & Digital Strategy Review', presenter: () => 'Zone PRO', objective: 'Improve reach', outcome: 'Content calendar agreed' },
  { topic: 'Website / CRM / IT Automation Discussion', presenter: () => 'Zone IT Chair', objective: 'Drive digital adoption', outcome: 'Roadmap accepted' },
  { topic: 'Best Practice Sharing Between Clubs', presenter: () => 'Each Club President', objective: 'Cross-pollinate ideas', outcome: 'Playbook updated' },
  { topic: 'Sponsorship & Partnership Opportunities', presenter: i => `Zone Chairperson ${i.zone_chairperson}`, objective: 'Identify partners', outcome: 'Pipeline expanded' },
  { topic: 'Awards & Club Recognition', presenter: i => `District Governor ${i.district_governor}`, objective: 'Recognise top performers', outcome: 'Clubs honoured' },
  { topic: 'Open House Discussion', presenter: () => 'All Delegates', objective: 'Surface concerns / ideas', outcome: 'Inputs captured' },
  { topic: 'Resolution & Action Approval', presenter: i => `Zone Chairperson ${i.zone_chairperson}`, objective: 'Pass resolutions', outcome: 'Resolutions approved' },
  { topic: 'Zone Target Allocation', presenter: () => 'Zone GMT / GST', objective: 'Set per-club targets', outcome: 'Targets accepted' },
  { topic: 'Final Announcements', presenter: () => 'Zone Secretary', objective: 'Share schedule', outcome: 'Calendar communicated' },
  { topic: 'Vote of Thanks', presenter: i => `${i.host_club} Designate`, objective: 'Acknowledge contributors', outcome: 'Gratitude expressed' },
  { topic: 'Group Photo & Closing', presenter: i => `Zone Chairperson ${i.zone_chairperson}`, objective: 'Capture record & adjourn', outcome: 'Meeting closed' },
];

function fallbackZoneAgenda(i: ZoneAgendaInput): string {
  const headerNote = '<!-- Place Lions International logo top-left, District logo top-right -->';
  const agendaRows = ZONE_FLOW.map((row, idx) => {
    const t = TIME_SLOTS_ZONE[idx] ?? '—';
    return `| ${idx + 1} | ${t} | ${row.topic} | ${row.presenter(i)} | ${row.objective} | ${row.outcome} |`;
  }).join('\n');

  const clubs = i.participating_clubs.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  const performanceRows = (clubs.length ? clubs : ['Club A', 'Club B', 'Club C'])
    .map(c => `| ${c} | ___ | ___ | ___ | ___ | ___ |`).join('\n');

  return `${headerNote}

# 🦁 Zone ${i.zone_number}, Region ${i.region_number}
## Zone Meeting — ${i.meeting_date}
**District:** ${i.district_name} · **Theme:** ${i.meeting_theme}

| | |
|---|---|
| **Date** | ${i.meeting_date} |
| **Time** | ${i.meeting_time} |
| **Venue** | ${i.venue} |
| **Hosted By** | ${i.host_club} |
| **Zone Chairperson** | ${i.zone_chairperson} |
| **Region Chairperson** | ${i.region_chairperson} |
| **District Governor** | ${i.district_governor} |
${i.chief_guest ? `| **Chief Guest / Dignitaries** | ${i.chief_guest} |\n` : ''}
---

## Executive Meeting Summary

- **Purpose:** Coordinate Zone ${i.zone_number} clubs under the theme "${i.meeting_theme}", aligned to District ${i.district_name} priorities.
- **Strategic Objectives:** review club performance, drive Lions Portal compliance, accelerate membership${i.membership_targets ? ` (${i.membership_targets})` : ''} and service${i.service_targets ? ` (${i.service_targets})` : ''}, lift LCIF contribution${i.lcif_goals ? ` (${i.lcif_goals})` : ''}.
- **Key Governance Goals:** standardise reporting, strengthen leadership pipeline, recognise excellence.
- **Expected Outcomes:** signed Zone MOM, per-club action items, district event coordination plan.
- **Inter-Club Coordination Goals:** ${i.club_performance_notes ?? 'share best practices, joint service projects, joint fundraising'}.

---

## Professional Agenda

| Sr No | Time | Agenda Topic | Presenter | Objective | Expected Outcome |
|---|---|---|---|---|---|
${agendaRows}

---

## Club Performance Dashboard

| Club Name | Membership Growth | Service Activities | LCIF Support | Reporting Status | Overall Rating |
|---|---|---|---|---|---|
${performanceRows}

---

## Action Tracking

| Action Item | Assigned Club/Person | Deadline | Priority | Status |
|---|---|---|---|---|
| File Zone MOM with District | Zone Secretary | T+5 days | High | Pending |
| Submit pending MyLion reports | Each Club Secretary | T+7 days | High | Pending |
| Confirm LCIF pledge schedule | Each Club LCIF Coordinator | T+10 days | High | Pending |
| Roll out QR attendance across zone | Zone IT Chair | T+14 days | Medium | Pending |
| Plan joint service project | Zone Service Chair | T+21 days | Medium | Pending |

---

## Zone Governance & Compliance

- **Reporting compliance status:** monthly MyLion / Lions Portal submissions audited.
- **Membership dues review:** ${i.reporting_topics ?? 'arrears reconciled, dues collection escalated for at-risk clubs'}.
- **Audit & documentation review:** half-yearly audit cycle; documentation index maintained.
- **Activity reporting compliance:** service hours, beneficiaries, photographs filed monthly.
- **Lions International portal usage:** every club active on Lions Portal; admin training conducted.
- **Digital record maintenance:** shared cloud drive per zone; retention 3 years.
- **Club governance standards:** charter compliance reviewed for each club annually.

---

## Digital Transformation

- **Zone-level CRM:** consolidated member, activity, donation pipeline across clubs.
- **Multi-club communication automation:** broadcast templates, scheduled WhatsApp/email.
- **QR attendance system:** standard QR per club; sync to zone dashboard.
- **WhatsApp broadcast automation:** segmented lists per club, per role.
- **AI-based zone reporting:** auto-draft Zone MOM from agenda + notes.
- **Shared cloud document system:** standardised folder structure across clubs.
- **Website & mobile app coordination:** zone microsite under district domain.
- **Dashboard reporting system:** live KPI dashboard for Zone Chair + DG cabinet.
- **Digital branding guidelines:** logo, colours, fonts, hashtags published.

---

## Post Meeting Deliverables

- [ ] Zone MOM drafted, signed, filed with District (T+5 days).
- [ ] Each club submits its own MOM + activity report (T+7 days).
- [ ] Attendance + photo documentation uploaded (T+2 days).
- [ ] Media submission to PRO + district circulars (T+3 days).
- [ ] Social media posts across all club handles (T+2 days).
- [ ] Follow-up review call before next zone meeting (T+30 days).

---

## Extra Professional Outputs

### 1. Zone Chairperson Opening Speech
Distinguished District Governor ${i.district_governor}, Region Chairperson ${i.region_chairperson}, presidents and secretaries of clubs in Zone ${i.zone_number}, fellow Lions, and our honoured guests — welcome. Today we gather under the theme "${i.meeting_theme}". The strength of this district is the strength of its zones; the strength of this zone is the strength of every club in it. Our agenda is ambitious, our motto is unchanging: **We Serve.**

### 2. District Governor Introduction (Draft)
Friends, it is my honour to invite our District Governor, ${i.district_governor}, to address us. The Governor's leadership of District ${i.district_name} has shaped the priorities we will discuss today. Please join me in welcoming the Governor for a strategic message.

### 3. Vote of Thanks (Draft)
On behalf of every club in Zone ${i.zone_number}, I thank our District Governor, Region Chairperson, Zone Chairperson, host club ${i.host_club}, and every Lion present. The conversations we held today must convert to service tomorrow. Thank you, and We Serve.

### 4. WhatsApp Reminder
🦁 *Zone ${i.zone_number} Meeting — ${i.district_name}*
📅 ${i.meeting_date} · 🕒 ${i.meeting_time}
📍 ${i.venue} (Host: ${i.host_club})
*Theme:* ${i.meeting_theme}
Kindly confirm attendance of President + Secretary + Treasurer per club. *We Serve.*

### 5. Email Invitation (Draft)
**Subject:** Zone ${i.zone_number} Meeting — ${i.district_name} — ${i.meeting_date}

Dear Club President & Secretary,

On behalf of Zone Chairperson ${i.zone_chairperson}, you are cordially invited to the Zone ${i.zone_number} meeting on ${i.meeting_date} at ${i.meeting_time}, hosted by ${i.host_club} at ${i.venue}. The meeting will be conducted under the theme "${i.meeting_theme}" with the participation of District Governor ${i.district_governor}.

The agenda is attached. Kindly ensure the President, Secretary, and Treasurer of each club are represented.

Yours in service,
**${i.zone_chairperson}**, Zone Chairperson — Zone ${i.zone_number}, ${i.district_name}

### 6. Professional Zone MOM Template
\`\`\`
Zone ${i.zone_number} Meeting — ${i.district_name}
Date: ${i.meeting_date} | Time: ${i.meeting_time} | Venue: ${i.venue}
Chair: ${i.zone_chairperson} | DG: ${i.district_governor}
Clubs Represented: ___ of ___
Attendance: ___ delegates

1. Call to Order
2. Invocation
3. Welcome — ${i.host_club} President
4. Introductions — ${i.zone_chairperson}
5. Addresses — Zone, Region, District
6. Previous MOM — Ratified
7. Club-wise reviews (membership, service, LCIF, reporting, finance)
... (per agenda)

Decisions: see Decision Tracker
Actions: see Action Tracker
Next Zone Meeting: ____
Closed at: ____ by ${i.zone_chairperson}
\`\`\`

### 7. Suggested PowerPoint Slide Structure
1. Cover — Zone, theme, date.
2. Zone snapshot.
3. Club performance dashboard.
4. Service KPIs.
5. LCIF status.
6. Reporting compliance heatmap.
7. Upcoming district events.
8. Leadership pipeline.
9. Awards & recognition.
10. Closing — thanks + next meeting.

### 8. Club Performance Evaluation Format
| Dimension | Weight | Method |
|---|---|---|
| Membership growth & retention | 25 % | Net additions / churn |
| Service activities (hours + beneficiaries) | 30 % | MyLion data |
| LCIF contribution | 15 % | Pledged + paid |
| Reporting compliance | 15 % | On-time MyLion + Lions Portal |
| Governance & finance | 15 % | Audit + dues collection |

### 9. Membership Growth Strategy Notes
- Drive 1 new member per existing member per year (1+1).
- Family + Leo bridge programs.
- Re-engage past members with a structured outreach.
- Member-experience surveys after every quarter.

### 10. Zone Leadership Best Practices
- Visit each club at least once per quarter.
- Maintain a Zone WhatsApp group for presidents + secretaries.
- Share a monthly Zone newsletter.
- Publish a Zone calendar at the start of the Lionistic year.
- Recognise one outstanding club per quarter.
`;
}
