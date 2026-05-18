export type LionsEventCategory =
  | 'service_week' | 'dg_visit' | 'cabinet_meeting' | 'zone_meeting'
  | 'club_meeting' | 'installation' | 'charter_anniversary' | 'mega_project'
  | 'regional_conference' | 'multiple_district_conference'
  | 'lions_international_convention' | 'training' | 'membership_drive'
  | 'fundraiser' | 'social' | 'awards_night' | 'leo_event'
  | 'special_day' | 'holiday' | 'other';

export type LionsEventScope =
  | 'international' | 'multiple_district' | 'district' | 'region' | 'zone' | 'club';

export const CATEGORY_META: Record<LionsEventCategory, { label: string; color: string; emoji: string }> = {
  service_week:                  { label: 'Service Week',            color: '#16A34A', emoji: '🤝' },
  dg_visit:                      { label: 'DG Visit',                color: '#DC2626', emoji: '🎖️' },
  cabinet_meeting:               { label: 'Cabinet Meeting',         color: '#7C3AED', emoji: '📋' },
  zone_meeting:                  { label: 'Zone Meeting',            color: '#2563EB', emoji: '🦁' },
  club_meeting:                  { label: 'Club Meeting',            color: '#0EA5E9', emoji: '🏛️' },
  installation:                  { label: 'Installation',            color: '#F59E0B', emoji: '🎗️' },
  charter_anniversary:           { label: 'Charter Anniversary',     color: '#D97706', emoji: '🎉' },
  mega_project:                  { label: 'Mega Project',            color: '#0F766E', emoji: '🚀' },
  regional_conference:           { label: 'Regional Conference',     color: '#0891B2', emoji: '🌍' },
  multiple_district_conference:  { label: 'MD Conference',           color: '#0369A1', emoji: '🌐' },
  lions_international_convention:{ label: 'LCI Convention',          color: '#1E3A8A', emoji: '🏆' },
  training:                      { label: 'Training',                color: '#9333EA', emoji: '🎓' },
  membership_drive:              { label: 'Membership Drive',        color: '#10B981', emoji: '👥' },
  fundraiser:                    { label: 'Fundraiser',              color: '#EAB308', emoji: '💰' },
  social:                        { label: 'Social',                  color: '#EC4899', emoji: '🎈' },
  awards_night:                  { label: 'Awards Night',            color: '#F97316', emoji: '🏅' },
  leo_event:                     { label: 'Leo Event',               color: '#A21CAF', emoji: '🦁' },
  special_day:                   { label: 'Special Day',             color: '#BE123C', emoji: '⭐' },
  holiday:                       { label: 'Holiday',                 color: '#525252', emoji: '🌴' },
  other:                         { label: 'Other',                   color: '#64748B', emoji: '📌' },
};

export const SCOPE_META: Record<LionsEventScope, { label: string; rank: number }> = {
  international:     { label: 'International',    rank: 1 },
  multiple_district: { label: 'Multiple District', rank: 2 },
  district:          { label: 'District',         rank: 3 },
  region:            { label: 'Region',           rank: 4 },
  zone:              { label: 'Zone',             rank: 5 },
  club:              { label: 'Club',             rank: 6 },
};

export function lionsYearFor(d: Date): string {
  const m = d.getMonth();
  const y = d.getFullYear();
  const start = m >= 6 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
