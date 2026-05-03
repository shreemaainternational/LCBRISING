/**
 * Maps internal creative types to Canva brand template IDs.
 * Replace the IDs with your actual Canva brand template IDs after
 * publishing them inside your Canva account.
 *
 * Each template is rendered via the Canva Connect "Brand Template Autofill" API:
 *   POST https://api.canva.com/rest/v1/autofills
 *   { "brand_template_id": "...", "data": { "field_name": { "type": "text", "text": "..." } } }
 */
export type CanvaTemplateKey =
  | 'flyer'
  | 'invitation'
  | 'birthday'
  | 'certificate'
  | 'post'
  | 'press_release';

export interface CanvaTemplate {
  id: string;            // Canva brand_template_id (DAFxxxxx)
  description: string;
  fields: string[];      // expected merge field names
  default_format: 'png' | 'jpg' | 'pdf';
}

export const CANVA_TEMPLATES: Record<CanvaTemplateKey, CanvaTemplate> = {
  flyer: {
    id: process.env.CANVA_TEMPLATE_FLYER ?? 'REPLACE_WITH_BRAND_TEMPLATE_ID',
    description: 'Generic event / camp flyer (A4 portrait)',
    fields: ['headline', 'subheading', 'body', 'date', 'location', 'cta', 'logo_url'],
    default_format: 'png',
  },
  invitation: {
    id: process.env.CANVA_TEMPLATE_INVITATION ?? 'REPLACE_WITH_BRAND_TEMPLATE_ID',
    description: 'Formal event invitation (5x7 in)',
    fields: ['headline', 'body', 'date', 'time', 'venue', 'rsvp_link', 'logo_url'],
    default_format: 'png',
  },
  birthday: {
    id: process.env.CANVA_TEMPLATE_BIRTHDAY ?? 'REPLACE_WITH_BRAND_TEMPLATE_ID',
    description: 'Member birthday wish (square 1080x1080)',
    fields: ['member_name', 'message', 'photo_url', 'logo_url'],
    default_format: 'png',
  },
  certificate: {
    id: process.env.CANVA_TEMPLATE_CERTIFICATE ?? 'REPLACE_WITH_BRAND_TEMPLATE_ID',
    description: 'Certificate of appreciation (A4 landscape)',
    fields: ['recipient_name', 'reason', 'date', 'signatory', 'logo_url'],
    default_format: 'pdf',
  },
  post: {
    id: process.env.CANVA_TEMPLATE_POST ?? 'REPLACE_WITH_BRAND_TEMPLATE_ID',
    description: 'Social media post (1080x1080)',
    fields: ['headline', 'subheading', 'body', 'cta', 'logo_url'],
    default_format: 'png',
  },
  press_release: {
    id: process.env.CANVA_TEMPLATE_PRESS ?? 'REPLACE_WITH_BRAND_TEMPLATE_ID',
    description: 'Newspaper-style press release (A4)',
    fields: ['headline', 'subheading', 'body', 'quote', 'date', 'logo_url'],
    default_format: 'pdf',
  },
};

export function getTemplate(key: CanvaTemplateKey): CanvaTemplate {
  return CANVA_TEMPLATES[key];
}
