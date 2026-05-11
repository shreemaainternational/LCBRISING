import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

export interface QrCardInput {
  upiString: string;
  invoiceNo: string;
  amount: number;
  payeeName: string;
  customerName?: string | null;
  payUrl?: string;
  description?: string | null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render a PhonePe-themed branded QR card as a self-contained SVG.
 * Suitable for sharing via WhatsApp file attachment, printing, embedding.
 */
export async function renderQrCardSvg(input: QrCardInput): Promise<string> {
  const qrSvg = await QRCode.toString(input.upiString, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 340,
    color: { dark: '#0F0F1A', light: '#FFFFFF' },
  });

  const innerQr = qrSvg
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<svg[^>]*>/, '<svg viewBox="0 0 41 41" preserveAspectRatio="xMidYMid meet" width="340" height="340" xmlns="http://www.w3.org/2000/svg">');

  const payee = escapeXml(input.payeeName);
  const inv = escapeXml(input.invoiceNo);
  const customer = input.customerName ? escapeXml(input.customerName) : '';
  const amount = `INR ${input.amount.toLocaleString('en-IN')}`;
  const payUrl = input.payUrl ? escapeXml(input.payUrl) : '';
  const desc = input.description ? escapeXml(input.description.slice(0, 80)) : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="720" viewBox="0 0 500 720">
  <defs>
    <linearGradient id="lcbHeader" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5f259f"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="lcbAmt" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a0f3e"/>
      <stop offset="100%" stop-color="#3b1a78"/>
    </linearGradient>
  </defs>

  <rect width="500" height="720" rx="32" ry="32" fill="#ffffff"/>
  <rect x="0" y="0" width="500" height="180" rx="32" ry="32" fill="url(#lcbHeader)"/>
  <rect x="0" y="120" width="500" height="60" fill="url(#lcbHeader)"/>

  <text x="250" y="58" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="14" font-weight="600" fill="#ffffff" letter-spacing="3" opacity="0.85">
    SCAN &amp; PAY
  </text>
  <text x="250" y="100" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="22" font-weight="700" fill="#ffffff">
    ${payee}
  </text>
  <text x="250" y="140" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="13" fill="#ffffff" opacity="0.85">
    Invoice #${inv}
  </text>

  <rect x="60" y="210" width="380" height="380" rx="24" ry="24" fill="#ffffff"
        stroke="#e9d5ff" stroke-width="3"/>
  <g transform="translate(80, 230)">
    ${innerQr}
  </g>

  <rect x="60" y="600" width="380" height="56" rx="14" ry="14" fill="url(#lcbAmt)"/>
  <text x="250" y="636" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="22" font-weight="700" fill="#ffffff">${amount}</text>

  ${customer ? `<text x="250" y="678" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="12" fill="#4b5563">For ${customer}</text>` : ''}
  ${desc ? `<text x="250" y="${customer ? 696 : 678}" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#6b7280">${desc}</text>` : ''}
  ${payUrl ? `<text x="250" y="${customer && desc ? 712 : customer ? 696 : desc ? 696 : 678}"
        text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="10" fill="#6b7280">${payUrl}</text>` : ''}
</svg>`;
}

/**
 * Render a printable A4 PDF poster with the branded QR card centered.
 * Uses the same colors as the SVG card.
 */
export async function renderQrCardPdf(input: QrCardInput): Promise<Buffer> {
  const qrPngBuffer = await QRCode.toBuffer(input.upiString, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 720,
    color: { dark: '#0F0F1A', light: '#FFFFFF' },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595;
    const cardW = 420;
    const cardX = (W - cardW) / 2;

    doc.rect(cardX, 80, cardW, 130).fill('#5f259f');
    doc.fillColor('#ffffff').fontSize(12).text('SCAN & PAY', cardX, 100, { width: cardW, align: 'center', characterSpacing: 3 });
    doc.fontSize(20).font('Helvetica-Bold').text(input.payeeName, cardX, 130, { width: cardW, align: 'center' });
    doc.font('Helvetica').fontSize(11).fillColor('#ddd6fe').text(`Invoice #${input.invoiceNo}`, cardX, 170, { width: cardW, align: 'center' });

    doc.fillColor('#ffffff').rect(cardX + 30, 240, cardW - 60, cardW - 60).stroke('#e9d5ff');
    doc.image(qrPngBuffer, cardX + 50, 260, { width: cardW - 100 });

    const amtTop = 260 + (cardW - 100) + 30;
    doc.rect(cardX + 30, amtTop, cardW - 60, 50).fill('#1a0f3e');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
      .text(`INR ${input.amount.toLocaleString('en-IN')}`, cardX + 30, amtTop + 16, { width: cardW - 60, align: 'center' });

    if (input.customerName) {
      doc.fillColor('#374151').font('Helvetica').fontSize(11)
        .text(`For ${input.customerName}`, cardX, amtTop + 70, { width: cardW, align: 'center' });
    }
    if (input.description) {
      doc.fillColor('#6b7280').fontSize(10)
        .text(input.description.slice(0, 120), cardX, amtTop + (input.customerName ? 88 : 70), { width: cardW, align: 'center' });
    }
    if (input.payUrl) {
      doc.fillColor('#6b7280').fontSize(9)
        .text(input.payUrl, cardX, amtTop + 110, { width: cardW, align: 'center' });
    }

    doc.end();
  });
}
