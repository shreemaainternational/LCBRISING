/**
 * Shared QuickAddCard field presets so each list page can render the
 * same form in two places (header button + empty-state CTA) without
 * duplicating field definitions.
 */
import type { QuickAddCardProps, QuickField } from './QuickAddCard';

interface PresetOptions {
  clubs?: { id: string; name: string }[];
  members?: { id: string; name: string; email: string }[];
  districts?: { id: string; code: string; name: string }[];
  regions?: { id: string; code: string; name: string }[];
}

export function regionsPreset(o: PresetOptions = {}): Omit<QuickAddCardProps, 'title'> {
  const districtOptions = (o.districts ?? []).map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }));
  const placeholder = districtOptions.length === 0
    ? 'District 3232 F1 (default — will be created)'
    : '— pick a district —';
  return {
    endpoint: '/api/regions',
    accent: 'purple',
    description: 'Add a region under a district. A region groups several zones. Leave the District menu on the default to auto-place under "District 3232 F1".',
    responseKey: 'region',
    fields: [
      { name: 'name', label: 'Region Name', type: 'text', required: true, placeholder: 'e.g. Region 5' },
      { name: 'district_id', label: 'District', type: 'select',
        placeholder, defaultValue: districtOptions[0]?.value ?? '', options: districtOptions },
      { name: 'chairperson_name', label: 'Region Chairperson', type: 'text' },
    ],
  };
}

export function membersPreset(o: PresetOptions = {}): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/crm/members',
    accent: 'emerald',
    description: "Add a new Lion or Leo to the roster. They'll receive a welcome email if Resend is configured.",
    responseKey: 'member',
    fields: [
      { name: 'name',  label: 'Full Name',  type: 'text',  required: true,  placeholder: 'Lion Firstname Lastname' },
      { name: 'email', label: 'Email',      type: 'email', required: true,  placeholder: 'name@email.com' },
      { name: 'phone', label: 'Phone',      type: 'tel',   placeholder: '+91…' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'tel',  placeholder: '+91…' },
      { name: 'role', label: 'Role', type: 'select', defaultValue: 'member', options: [
        { value: 'member', label: 'Member' },
        { value: 'officer', label: 'Officer' },
        { value: 'treasurer', label: 'Treasurer' },
        { value: 'secretary', label: 'Secretary' },
        { value: 'president', label: 'President' },
        { value: 'admin', label: 'Admin' },
      ] },
      { name: 'status', label: 'Status', type: 'select', defaultValue: 'pending', options: [
        { value: 'pending', label: 'Pending' },
        { value: 'active', label: 'Active' },
        { value: 'lapsed', label: 'Lapsed' },
        { value: 'suspended', label: 'Suspended' },
      ] },
      { name: 'club_id', label: 'Club', type: 'select',
        options: (o.clubs ?? []).map((c) => ({ value: c.id, label: c.name })) },
      { name: 'birthday', label: 'Birthday', type: 'date' },
      { name: 'lions_member_id', label: 'Membership Number', type: 'text', required: true, hint: 'LCI membership number (required)' },
    ],
  };
}

export function districtsPreset(): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/crm/districts',
    accent: 'blue',
    description: 'Create a new Lions district. You can sync existing districts from the Lions Portal under Sync → Lions instead.',
    responseKey: 'district',
    fields: [
      { name: 'code', label: 'District Code', type: 'text', required: true, placeholder: 'e.g. 3232 F1' },
      { name: 'name', label: 'District Name', type: 'text', required: true },
      { name: 'governor_name', label: 'Governor', type: 'text' },
      { name: 'cabinet_secretary_name', label: 'Cabinet Secretary', type: 'text' },
      { name: 'cabinet_treasurer_name', label: 'Cabinet Treasurer', type: 'text' },
      { name: 'lions_year', label: 'Lions Year', type: 'text', placeholder: '2025-26' },
    ],
  };
}

export function zonesPreset(o: PresetOptions = {}): Omit<QuickAddCardProps, 'title'> {
  const districtOptions = (o.districts ?? []).map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}`,
  }));
  // Empty-state placeholder advertises the server's self-bootstrap so
  // an admin who's never seeded districts still sees what will happen
  // when they hit Create.
  const placeholder = districtOptions.length === 0
    ? 'District 3232 F1 (default — will be created)'
    : '— pick a district —';

  return {
    endpoint: '/api/zones',
    accent: 'cyan',
    description: 'Add a new zone under a district. Leave the District menu on the default to auto-place under "District 3232 F1".',
    responseKey: 'zone',
    fields: [
      { name: 'name', label: 'Zone Name', type: 'text', required: true, placeholder: 'e.g. Zone B' },
      { name: 'district_id', label: 'District', type: 'select',
        placeholder,
        defaultValue: districtOptions[0]?.value ?? '',
        options: districtOptions },
      { name: 'region_id', label: 'Region', type: 'select',
        placeholder: '— optional region —',
        options: (o.regions ?? []).map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` })) },
      { name: 'zone_chairperson_name', label: 'Zone Chairperson', type: 'text' },
    ],
  };
}

export function clubsPreset(o: PresetOptions = {}): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/crm/clubs',
    accent: 'blue',
    description: 'Charter a new club. Use the Lions sync to onboard existing clubs from MyLCI instead.',
    responseKey: 'club',
    fields: [
      { name: 'name', label: 'Club Name', type: 'text', required: true, placeholder: 'Lions Club of …' },
      { name: 'district_id', label: 'District', type: 'select',
        options: (o.districts ?? []).map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` })) },
      { name: 'club_number', label: 'LCI Club Number', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text', defaultValue: 'Gujarat' },
      { name: 'country', label: 'Country', type: 'text', defaultValue: 'India' },
      { name: 'charter_date', label: 'Charter Date', type: 'date' },
    ],
  };
}

export function duesPreset(o: PresetOptions = {}): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/dues',
    accent: 'amber',
    description: 'Raise a new dues invoice against a member.',
    responseKey: 'due',
    fields: [
      { name: 'member_id', label: 'Member', type: 'select', required: true,
        options: (o.members ?? []).map((m) => ({ value: m.id, label: `${m.name} (${m.email})` })) },
      { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 0, cast: 'number' },
      { name: 'due_date', label: 'Due Date', type: 'date', required: true },
      { name: 'period_label', label: 'Period Label', type: 'text', placeholder: 'e.g. Q1 2026 / Annual 2025-26' },
    ],
  };
}

export function donationsPreset(): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/donations',
    accent: 'amber',
    description: 'Record a cheque, cash, or bank-transfer donation manually. Online donations are captured automatically.',
    responseKey: 'donation',
    fields: [
      { name: 'donor_name',  label: 'Donor Name', type: 'text',  required: true },
      { name: 'amount',      label: 'Amount (₹)', type: 'number', required: true, min: 1, cast: 'number' },
      { name: 'donor_email', label: 'Email',     type: 'email' },
      { name: 'donor_phone', label: 'Phone',     type: 'tel' },
      { name: 'donor_pan',   label: 'PAN',       type: 'text', hint: 'For 80G receipts' },
      { name: 'campaign',    label: 'Campaign',  type: 'text', placeholder: 'e.g. Eye Camp 2026' },
      { name: 'is_anonymous', label: 'Anonymous donor', type: 'checkbox', cast: 'boolean' },
      { name: 'message',     label: 'Message',   type: 'textarea' },
    ],
  };
}

export function eventsPreset(): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/events',
    accent: 'purple',
    description: 'Create an event. A QR code is auto-issued so attendees can self check-in from the mobile app.',
    responseKey: 'event',
    // Events table stores a single cover_url. Promote the first uploaded
    // photo to cover, drop the rest (we can wire a media gallery later).
    // Serializable descriptor — a beforeSubmit function can't be passed
    // from this server-rendered preset into the QuickAddCard client
    // component (Next.js throws and the page 500s).
    promotePhotos: { first: 'cover_url' },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Eye Camp, Installation Night…' },
      { name: 'date', label: 'Starts At', type: 'datetime-local', required: true },
      { name: 'end_date', label: 'Ends At', type: 'datetime-local' },
      { name: 'location', label: 'Location', type: 'text', placeholder: 'Venue or address' },
      { name: 'capacity', label: 'Capacity', type: 'number', min: 1, cast: 'int' },
      { name: 'cover_url', label: 'Cover Image URL', type: 'url' },
      { name: 'is_public', label: 'Public event (visible on website)', type: 'checkbox', defaultValue: true, cast: 'boolean' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'photos', label: 'Event photos / poster', type: 'photos',
        folder: 'events', minPhotos: 1, maxPhotos: 20,
        hint: 'Upload the event poster, hall layout, or gallery photos from past editions.' },
    ],
  };
}

export function activitiesPreset(): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/activities',
    accent: 'blue',
    description: 'Log a service project. Photos, GPS, before/after media and CSR partner can be added afterwards.',
    responseKey: 'activity',
    fields: [
      { name: 'title', label: 'Project Title', type: 'text', required: true, placeholder: 'Eye Camp at SSG Hospital' },
      { name: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
      { name: 'category', label: 'Service Category', type: 'select', defaultValue: 'healthcare', options: [
        { value: 'vision', label: 'Vision' },
        { value: 'hunger', label: 'Hunger Relief' },
        { value: 'environment', label: 'Environment' },
        { value: 'diabetes', label: 'Diabetes Awareness' },
        { value: 'childhood_cancer', label: 'Childhood Cancer' },
        { value: 'humanitarian', label: 'Humanitarian' },
        { value: 'youth', label: 'Youth Development' },
        { value: 'education', label: 'Education' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'women', label: 'Women Empowerment' },
        { value: 'senior', label: 'Senior Citizens' },
        { value: 'other', label: 'Other' },
      ] },
      { name: 'beneficiaries', label: 'Beneficiaries', type: 'number', min: 0, defaultValue: 0, cast: 'int' },
      { name: 'lion_members_count', label: 'Presence of Lion Member', type: 'number', min: 0, defaultValue: 0, cast: 'int', hint: 'How many Lion members attended this project' },
      { name: 'service_hours', label: 'Service Hours', type: 'number', min: 0, defaultValue: 0, cast: 'number', step: 0.5 },
      { name: 'amount_raised', label: 'Funds Raised (₹)', type: 'number', min: 0, defaultValue: 0, cast: 'number' },
      { name: 'location', label: 'Location', type: 'text', placeholder: 'Venue or city' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'photos', label: 'Photos & media', type: 'photos',
        folder: 'activities', minPhotos: 6, maxPhotos: 20,
        hint: 'Upload at least 6 photos of the project — before, during and after. Drag-drop or use the camera on mobile.' },
    ],
  };
}

export function socialPreset(): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/social/post',
    accent: 'rose',
    description: 'Queue a post for one platform without going through the Creative Builder.',
    responseKey: 'post',
    // Serializable photo promotion (see QuickAddCard.promotePhotos):
    // first photo → image_url (if unset), full set → image_urls.
    promotePhotos: { first: 'image_url', all: 'image_urls' },
    fields: [
      { name: 'platform', label: 'Platform', type: 'select', required: true, options: [
        { value: 'facebook', label: 'Facebook' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'linkedin', label: 'LinkedIn' },
      ] },
      { name: 'caption', label: 'Caption', type: 'textarea', required: true, placeholder: 'Write or paste the post copy…' },
      { name: 'image_url', label: 'Image URL', type: 'url', hint: 'Optional cover image (or upload below)' },
      { name: 'scheduled_at', label: 'Schedule (optional)', type: 'datetime-local', hint: 'Leave blank to publish immediately' },
      { name: 'photos', label: 'Upload media', type: 'photos',
        folder: 'social', minPhotos: 1, maxPhotos: 10,
        hint: 'Upload cover image or carousel photos.' },
    ],
  };
}

export function beneficiariesPreset(): Omit<QuickAddCardProps, 'title'> {
  return {
    endpoint: '/api/beneficiaries',
    accent: 'emerald',
    description: 'Quickly create a beneficiary record. Add demographics + service history from the profile page.',
    responseKey: 'beneficiary',
    // Serializable photo promotion (see QuickAddCard.promotePhotos):
    // first uploaded photo → photo_url.
    promotePhotos: { first: 'photo_url' },
    fields: [
      { name: 'full_name', label: 'Full Name', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'tel' },
      { name: 'gender', label: 'Gender', type: 'select', options: [
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
        { value: 'other', label: 'Other' },
        { value: 'undisclosed', label: 'Undisclosed' },
      ] },
      { name: 'age', label: 'Age', type: 'number', min: 0, max: 120, cast: 'int' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text', defaultValue: 'Gujarat' },
      { name: 'photos', label: 'Profile photo', type: 'photos',
        folder: 'beneficiaries', minPhotos: 1, maxPhotos: 3,
        hint: 'Optional. Photo helps caseworkers identify the beneficiary.' },
    ],
  };
}

export type { QuickField };
