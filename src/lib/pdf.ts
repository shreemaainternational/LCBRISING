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
      .text('District 3232 F1 · Vadodara, Gujarat, India', { align: 'center' })
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

// =====================================================================
// Invoices + payment receipts
// =====================================================================

export interface InvoicePdfData {
  invoiceNo: string;
  date: string | Date;
  dueDate?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  description?: string | null;
  amount: number;
  gstRate?: number | null;
  gstAmount?: number | null;
  payUrl?: string;
  qrPngBuffer?: Buffer | null;
  status: string;
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Tax Invoice');

    const left = 50;
    let y = doc.y + 10;

    doc.fontSize(10).fillColor('#666');
    doc.text('Invoice No.', left, y).text(data.invoiceNo, left + 100, y, { width: 200 });
    y += 16;
    doc.text('Date', left, y).text(formatDate(data.date), left + 100, y);
    y += 16;
    if (data.dueDate) {
      doc.text('Due Date', left, y).text(formatDate(data.dueDate), left + 100, y);
      y += 16;
    }
    if (data.status) {
      doc.text('Status', left, y).fillColor(data.status === 'paid' ? '#16a34a' : '#b45309')
        .text(data.status.toUpperCase(), left + 100, y);
      doc.fillColor('#666');
      y += 16;
    }
    y += 8;
    doc.fillColor('#111').fontSize(11).text('Bill to', left, y);
    y += 16;
    doc.fontSize(10).fillColor('#333').text(data.customerName, left, y);
    y += 14;
    if (data.customerEmail) {
      doc.text(data.customerEmail, left, y);
      y += 14;
    }
    if (data.customerPhone) {
      doc.text(data.customerPhone, left, y);
      y += 14;
    }

    y += 16;
    doc.rect(left, y, 495, 24).fill('#1e3a8a');
    doc.fillColor('#fff').fontSize(10);
    doc.text('Description', left + 8, y + 7, { width: 320 });
    doc.text('Amount (INR)', left + 360, y + 7, { width: 130, align: 'right' });
    y += 32;

    doc.fillColor('#111');
    doc.text(data.description ?? 'Service / Charge', left + 8, y, { width: 320 });
    doc.text(formatINR(data.amount), left + 360, y, { width: 130, align: 'right' });
    y += 24;

    const taxable = data.amount;
    const gstAmt = data.gstAmount ?? 0;
    const total = taxable + gstAmt;

    doc.fillColor('#666').text('Subtotal', left + 240, y, { width: 110, align: 'right' });
    doc.fillColor('#111').text(formatINR(taxable), left + 360, y, { width: 130, align: 'right' });
    y += 18;
    if (gstAmt > 0) {
      doc.fillColor('#666').text(`GST (${data.gstRate ?? 0}%)`, left + 240, y, { width: 110, align: 'right' });
      doc.fillColor('#111').text(formatINR(gstAmt), left + 360, y, { width: 130, align: 'right' });
      y += 18;
    }
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(left + 240, y).lineTo(545, y).stroke();
    y += 8;
    doc.fillColor('#111').fontSize(12).text('Total Payable', left + 240, y, { width: 110, align: 'right' });
    doc.text(formatINR(total), left + 360, y, { width: 130, align: 'right' });
    y += 32;

    if (data.qrPngBuffer && data.payUrl) {
      doc.fontSize(11).fillColor('#111').text('Scan to pay via UPI', left, y);
      y += 16;
      doc.image(data.qrPngBuffer, left, y, { width: 140, height: 140 });
      doc.fontSize(9).fillColor('#666').text(
        'Use PhonePe, GPay, Paytm, or any UPI app to scan this QR.\n' +
        `Or open: ${data.payUrl}`,
        left + 160, y + 10, { width: 320 },
      );
    } else if (data.payUrl) {
      doc.fontSize(10).fillColor('#444').text(`Pay online: ${data.payUrl}`, left, y);
    }

    doc.end();
  });
}

export interface PaymentReceiptData {
  receiptNo: string;
  invoiceNo: string;
  customerName: string;
  customerEmail?: string | null;
  amount: number;
  utr?: string | null;
  upiVpa?: string | null;
  method?: string | null;
  paidOn: string | Date;
}

export async function renderPaymentReceiptPdf(data: PaymentReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Payment Receipt');

    const left = 60;
    let y = doc.y + 10;
    const rows: [string, string][] = [
      ['Receipt No.', data.receiptNo],
      ['Invoice No.', data.invoiceNo],
      ['Paid by', data.customerName],
      ...(data.customerEmail ? [['Email', data.customerEmail]] as [string, string][] : []),
      ['Amount', formatINR(data.amount)],
      ['Paid on', formatDate(data.paidOn, { hour: '2-digit', minute: '2-digit' })],
      ...(data.method ? [['Method', data.method]] as [string, string][] : []),
      ...(data.utr ? [['UTR', data.utr]] as [string, string][] : []),
      ...(data.upiVpa ? [['Payer VPA', data.upiVpa]] as [string, string][] : []),
    ];
    doc.fontSize(11);
    for (const [label, value] of rows) {
      doc.fillColor('#666').text(label, left, y, { width: 130 });
      doc.fillColor('#111').text(String(value), left + 140, y);
      y += 22;
    }
    y += 16;
    doc.fontSize(10).fillColor('#16a34a').text('Payment confirmed. Thank you.', left, y);

    doc.end();
  });
}

export interface RefundReceiptData {
  refundId: string;
  invoiceNo: string;
  customerName: string;
  paymentAmount: number;
  refundAmount: number;
  reason?: string | null;
  utr?: string | null;
  processedAt: string | Date;
}

export async function renderRefundReceiptPdf(data: RefundReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Refund Receipt');

    const left = 60;
    let y = doc.y + 10;
    const rows: [string, string][] = [
      ['Refund ID', data.refundId],
      ['Invoice', data.invoiceNo],
      ['Customer', data.customerName],
      ['Original payment', formatINR(data.paymentAmount)],
      ['Refunded', formatINR(data.refundAmount)],
      ['Processed on', formatDate(data.processedAt, { hour: '2-digit', minute: '2-digit' })],
      ...(data.utr ? [['Refund UTR', data.utr]] as [string, string][] : []),
      ...(data.reason ? [['Reason', data.reason]] as [string, string][] : []),
    ];
    doc.fontSize(11);
    for (const [label, value] of rows) {
      doc.fillColor('#666').text(label, left, y, { width: 130 });
      doc.fillColor('#111').text(String(value), left + 140, y);
      y += 22;
    }
    y += 16;
    doc.fontSize(10).fillColor('#b45309')
      .text('Refund processed. The amount will reflect in the original payment method.', left, y);

    doc.end();
  });
}

function drawHeader(doc: PDFKit.PDFDocument, title: string) {
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
    .moveDown(0.6)
    .fontSize(16)
    .fillColor('#000')
    .text(title, { align: 'center' });
}
