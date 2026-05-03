import PDFDocument from 'pdfkit';
import { formatINR, formatDate } from '@/lib/utils';

export interface ReceiptData {
  receiptNo: string;
  donorName: string;
  donorEmail?: string | null;
  donorPan?: string | null;
  amount: number;
  campaign?: string | null;
  date: string | Date;
  paymentRef?: string | null;
}

/**
 * Render an 80g-style donation receipt to a PDF buffer.
 */
export async function renderDonationReceipt(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(20)
      .fillColor('#1e3a8a')
      .text('Lions Club of Baroda Rising Star', { align: 'center' })
      .moveDown(0.2)
      .fontSize(10)
      .fillColor('#444')
      .text('District 323-E · Vadodara, Gujarat, India', { align: 'center' })
      .moveDown(0.4)
      .strokeColor('#fbbf24')
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);

    doc
      .fontSize(16)
      .fillColor('#000')
      .text('Donation Receipt', { align: 'center' })
      .moveDown(1);

    const left = 60;
    const lineHeight = 22;
    let y = doc.y;

    const rows: [string, string][] = [
      ['Receipt No.', data.receiptNo],
      ['Date', formatDate(data.date)],
      ['Donor', data.donorName],
      ...(data.donorEmail ? ([['Email', data.donorEmail]] as [string, string][]) : []),
      ...(data.donorPan  ? ([['PAN',   data.donorPan]]   as [string, string][]) : []),
      ['Amount', formatINR(data.amount)],
      ...(data.campaign  ? ([['Campaign', data.campaign]] as [string, string][]) : []),
      ...(data.paymentRef ? ([['Payment Ref', data.paymentRef]] as [string, string][]) : []),
    ];

    doc.fontSize(11);
    for (const [label, value] of rows) {
      doc.fillColor('#666').text(label, left, y, { width: 130 });
      doc.fillColor('#000').text(String(value), left + 140, y);
      y += lineHeight;
    }

    doc
      .moveDown(2)
      .fontSize(10)
      .fillColor('#444')
      .text(
        'This receipt acknowledges your generous contribution. Donations to the ' +
        'Lions Club may qualify for tax exemption under applicable Indian law. ' +
        'Please retain this receipt for your records.',
        50,
        y + 30,
        { align: 'justify', width: 495 },
      );

    doc
      .moveDown(3)
      .fontSize(10)
      .fillColor('#000')
      .text('_____________________________', { align: 'right' })
      .text('Authorised Signatory', { align: 'right' });

    doc.end();
  });
}
