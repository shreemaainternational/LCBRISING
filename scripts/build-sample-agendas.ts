/**
 * One-shot script — emits docs/SAMPLE_AGENDA_CLUB.md and
 * docs/SAMPLE_AGENDA_ZONE.md using the deterministic template
 * fallbacks from src/lib/ai/meeting-agenda.ts. Re-run after
 * editing the prompts/templates to refresh the samples.
 *
 *   npx tsx scripts/build-sample-agendas.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateClubAgenda, generateZoneAgenda } from '@/lib/ai/meeting-agenda';

async function main() {
  process.env.OPENAI_API_KEY = '';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const club = await generateClubAgenda({
    club_name: 'Lions Club of Baroda Rising Star',
    district_name: 'District 3232 F1',
    region: '1',
    zone: '1',
    meeting_type: 'Board Meeting',
    meeting_date: '2026-06-15',
    meeting_time: '18:00',
    venue: 'Hotel Surya Palace, Sayajigunj, Vadodara',
    president_name: 'Lion Ravi Patel',
    secretary_name: 'Lion Meera Shah',
    treasurer_name: 'Lion Anil Joshi',
    chief_guest: 'PDG Lion Bharat Desai',
    meeting_theme: 'We Serve — driving measurable community impact in Vadodara',
    service_focus: 'Vision screening camps + monthly food bank',
    membership_target: '+8 net new members by 30 June 2026',
    upcoming_projects: 'Monsoon tree plantation; sponsored cataract surgeries; Leo skill workshop',
    financial_review: 'Q1 dues collection; activity-wise budget variance; LCIF pledge tracking',
    digital_reporting: 'MyLion service activity backlog; CRM attendance sync; Razorpay reconciliation',
    awards_recognition: 'Member of the Quarter; Birthday & Anniversary honour roll',
    sponsorship_topics: 'Hospital MoU renewal; CSR partner Q2 review',
    csr_activities: 'Beneficiary records update; 80G receipts; donor stewardship',
    emergency_matters: 'Heatwave relief readiness',
    lions_intl_updates: 'New MyLion reporting cadence; District 3232 F1 cabinet circular #14',
  });

  const zone = await generateZoneAgenda({
    district_name: 'District 3232 F1',
    region_number: '1',
    zone_number: '1',
    zone_chairperson: 'Lion Smita Mehta',
    region_chairperson: 'Lion Kiran Vora',
    district_governor: 'DG Lion Hardik Trivedi',
    meeting_date: '2026-07-12',
    meeting_time: '10:00',
    venue: 'Hotel Express Towers, Alkapuri, Vadodara',
    host_club: 'Lions Club of Baroda Rising Star',
    participating_clubs:
      'Lions Club of Baroda Rising Star, Lions Club of Baroda Heritage, Lions Club of Vadodara Greater, Lions Club of Sayajigunj, Lions Club of Akota',
    chief_guest: 'PCC Lion Jignesh Patel',
    meeting_theme: 'Strengthening Service, Standardising Reporting',
    membership_targets: 'Zone net +30 members by 30 Sep 2026',
    service_targets: '12 zone-wide service projects this quarter',
    lcif_goals: 'Zone LCIF contribution of USD 5,000 by Dec 2026',
    leadership_topics: 'GMT/GLT pipeline; club officer training; succession plans',
    reporting_topics: 'MyLion compliance heatmap; Lions Portal audit; activity hour backlog',
    training_topics: 'Onboarding bootcamp; PR & social media masterclass; finance workshop',
    digital_topics: 'Shared zone CRM rollout; QR attendance pilot; AI MOM drafting',
    awards_recognition: 'Club of the Quarter; Best Service Project; Best Reporting',
    club_performance_notes: 'Two clubs behind on MyLion submissions; one club below quorum target',
    upcoming_district_events:
      'District Convention 12 Sep; Cabinet Meeting 28 Aug; Leadership Conclave 5 Oct',
  });

  const docs = resolve(process.cwd(), 'docs');
  writeFileSync(resolve(docs, 'SAMPLE_AGENDA_CLUB.md'), club.markdown);
  writeFileSync(resolve(docs, 'SAMPLE_AGENDA_ZONE.md'), zone.markdown);
  console.log('Wrote docs/SAMPLE_AGENDA_CLUB.md and docs/SAMPLE_AGENDA_ZONE.md');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
