import PptxGenJS from 'pptxgenjs';
import type { PresentationSlide } from './circular-assets';

const NAVY = '0B2545';
const GOLD = 'E5A619';
const MUTED = '64748B';
const W = 13.333;
const H = 7.5;

/**
 * Render a lightweight, on-brand deck from the AI-generated slide outline of
 * a circular entry. Returns a .pptx node Buffer ready to upload to storage.
 */
export async function buildEntryPptx(args: {
  title: string;
  subtitle?: string | null;
  districtCode: string;
  slides: PresentationSlide[];
}): Promise<Buffer> {
  const p = new PptxGenJS();
  p.layout = 'LAYOUT_WIDE';
  p.title = args.title;
  p.company = `Lions District ${args.districtCode}`;

  // Cover.
  const cover = p.addSlide();
  cover.background = { color: NAVY };
  cover.addShape('rect', { x: 0, y: 4.4, w: W, h: 0.08, fill: { color: GOLD } });
  cover.addText(args.title, {
    x: 0.7, y: 2.4, w: W - 1.4, h: 1.4, fontSize: 34, bold: true, color: 'FFFFFF', fontFace: 'Calibri',
  });
  if (args.subtitle) {
    cover.addText(args.subtitle, {
      x: 0.7, y: 3.8, w: W - 1.4, h: 0.6, fontSize: 16, color: 'FFE7B0', fontFace: 'Calibri',
    });
  }
  cover.addText(`Lions Clubs International · District ${args.districtCode} · We Serve`, {
    x: 0.7, y: H - 0.8, w: W - 1.4, h: 0.4, fontSize: 12, color: 'CBD5E1', fontFace: 'Calibri',
  });

  // Content slides.
  for (const slide of args.slides) {
    const s = p.addSlide();
    s.background = { color: 'FFFFFF' };
    s.addShape('rect', { x: 0, y: 0, w: W, h: 0.9, fill: { color: NAVY } });
    s.addShape('rect', { x: 0, y: 0.9, w: W, h: 0.06, fill: { color: GOLD } });
    s.addText(slide.title || 'Slide', {
      x: 0.5, y: 0.15, w: W - 1, h: 0.6, fontSize: 22, bold: true, color: 'FFFFFF', fontFace: 'Calibri',
    });
    if (slide.bullets.length) {
      s.addText(
        slide.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        { x: 0.7, y: 1.4, w: W - 1.4, h: H - 2.2, fontSize: 18, color: '1E293B', fontFace: 'Calibri', valign: 'top', lineSpacingMultiple: 1.2 },
      );
    }
    s.addText(`District ${args.districtCode}`, {
      x: W - 3, y: H - 0.5, w: 2.6, h: 0.3, fontSize: 10, color: MUTED, align: 'right', fontFace: 'Calibri',
    });
  }

  const out = await p.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}
