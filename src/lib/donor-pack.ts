/**
 * 80G consolidated donor pack: one PDF summarising every donation made
 * by a donor inside an Indian fiscal year (1 Apr → 31 Mar). Fired by
 * /api/cron/donor-pack on the first Sunday of April for the year that
 * just ended.
 */
import PDFDocument from 'pdfkit';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { formatINR, formatDate } from '@/lib/utils';
import { env, integrations } from '@/lib/env';

export interface FiscalYear { start: Date; end: Date; label: string }

export function indianFiscalYearForCron(today: Date = new Date()): FiscalYear {
  // Cron runs in April → fiscal year is (Apr 1 previous calendar year) – (Mar 31 this calendar year).
  const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() - 1 : today.getFullYear() - 1;
  // Simplification: always treat the most recently-ended FY.
  const fyEndYear = fyStartYear + 1;
  return {
    start: new Date(fyStartYear, 3, 1),  // Apr 1
    end: new Date(fyEndYear, 2, 31, 23, 59, 59), // Mar 31
    label: `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`,
  };
}

interface DonationRow {
  id: string;
  donor_name: string;
  donor_email: string | null;
  donor_pan: string | null;
  amount: number;
  campaign: string | null;
  receipt_no: string | null;
  created_at: string;
}

export interface DonorGroup {
  email: string;
  name: string;
  pan: string | null;
  rows: DonationRow[];
  total: number;
}

export async function groupDonationsByDonor(fy: FiscalYear): Promise<DonorGroup[]> {
  const db = createAdminClient();
  const { data } = await db.from('donations')
    .select('id, donor_name, donor_email, donor_pan, amount, campaign, receipt_no, created_at')
    .gte('created_at', fy.start.toISOString())
    .lte('created_at', fy.end.toISOString())
    .order('created_at', { ascending: true });

  const map = new Map<string, DonorGroup>();
  for (const d of (data ?? []) as DonationRow[]) {
    if (!d.donor_email) continue; // need an address to send the pack
    const key = d.donor_email.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { email: key, name: d.donor_name, pan: d.donor_pan, rows: [], total: 0 });
    }
    const g = map.get(key)!;
    g.rows.push(d);
    g.total += Number(d.amount ?? 0);
    if (!g.pan && d.donor_pan) g.pan = d.donor_pan;
  }
  return Array.from(map.values());
}

export async function renderDonorPackPdf(group: DonorGroup, fy: FiscalYear): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#1e3a8a').text('Lions Club of Baroda Rising Star', { align: 'center' })
      .moveDown(0.2).fontSize(10).fillColor('#444')
      .text('District 3232 F1 · Vadodara, Gujarat, India', { align: 'center' })
      .moveDown(0.4).strokeColor('#fbbf24').lineWidth(2)
      .moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

    doc.fontSize(16).fillColor('#000').text('80G Annual Donor Statement', { align: 'center' }).moveDown(0.5);
    doc.fontSize(11).fillColor('#444').text(fy.label, { align: 'center' }).moveDown(1);

    doc.fontSize(11).fillColor('#000');
    const left = 60;
    const lh = 18;
    let y = doc.y;
    const meta: [string, string][] = [
      ['Donor', group.name],
      ['Email', group.email],
      ...(group.pan ? ([['PAN', group.pan]] as [string, string][]) : []),
      ['Period', `${formatDate(fy.start)} – ${formatDate(fy.end)}`],
      ['Total contributed', formatINR(group.total)],
      ['Receipts in this pack', String(group.rows.length)],
    ];
    for (const [k, v] of meta) {
      doc.fillColor('#666').text(k, left, y, { width: 130 });
      doc.fillColor('#000').text(String(v), left + 140, y);
      y += lh;
    }
    doc.moveDown(1);

    // Receipts table
    const tableTop = y + 20;
    doc.fontSize(11).fillColor('#1e3a8a').text('Receipt-wise breakdown', left, tableTop);
    let ry = tableTop + 22;
    doc.fontSize(9).fillColor('#666');
    doc.text('Date', left, ry, { width: 80 });
    doc.text('Receipt #', left + 80, ry, { width: 100 });
    doc.text('Campaign', left + 180, ry, { width: 180 });
    doc.text('Amount', left + 360, ry, { width: 100, align: 'right' });
    ry += 16;
    doc.strokeColor('#ddd').lineWidth(1).moveTo(left, ry - 4).lineTo(left + 460, ry - 4).stroke();
    doc.fontSize(10).fillColor('#000');
    for (const r of group.rows) {
      if (ry > 780) { doc.addPage(); ry = 60; }
      doc.text(formatDate(r.created_at), left, ry, { width: 80 });
      doc.text(r.receipt_no ?? r.id.slice(0, 8), left + 80, ry, { width: 100 });
      doc.text(r.campaign ?? '—', left + 180, ry, { width: 180 });
      doc.text(formatINR(Number(r.amount)), left + 360, ry, { width: 100, align: 'right' });
      ry += 16;
    }

    doc.strokeColor('#1e3a8a').lineWidth(1).moveTo(left, ry).lineTo(left + 460, ry).stroke();
    ry += 8;
    doc.fontSize(11).fillColor('#000');
    doc.text('Total', left, ry, { width: 180 });
    doc.fillColor('#1e3a8a').text(formatINR(group.total), left + 360, ry, { width: 100, align: 'right' });

    doc.moveDown(3);
    doc.fontSize(9).fillColor('#666').text(
      'This statement consolidates every donation receipt issued to you during the ' +
      'fiscal year shown above. Donations to the Lions Club may qualify for tax exemption ' +
      'under Section 80G of the Income Tax Act, 1961 (subject to applicable conditions). ' +
      'Please retain this statement for your records. For questions, reply to this email.',
      left, doc.y, { width: 460 },
    );

    doc.bufferedPageRange();
    doc.flushPages();
    doc.end();
  });
}

export interface DonorPackResult {
  donor_email: string;
  donation_count: number;
  total: number;
  status: 'sent' | 'skipped' | 'failed' | 'no_email_provider';
  error?: string;
  pdf_url?: string | null;
}

export async function generateAndSendPacks(fy: FiscalYear, opts: { force?: boolean } = {}): Promise<DonorPackResult[]> {
  const db = createAdminClient();
  const groups = await groupDonationsByDonor(fy);
  const out: DonorPackResult[] = [];

  for (const g of groups) {
    if (g.total <= 0 || g.rows.length === 0) continue;

    if (!opts.force) {
      const { data: existing } = await db.from('donor_tax_packs')
        .select('id, email_status')
        .eq('donor_email', g.email)
        .eq('fiscal_year_start', fy.start.toISOString().slice(0, 10))
        .maybeSingle();
      if (existing && existing.email_status === 'sent') {
        out.push({ donor_email: g.email, donation_count: g.rows.length, total: g.total, status: 'skipped' });
        continue;
      }
    }

    const pdf = await renderDonorPackPdf(g, fy);
    const safeEmail = g.email.replace(/[^a-z0-9@._-]/gi, '_');
    const path = `donor-packs/${fy.start.getFullYear()}/${safeEmail}-${Date.now()}.pdf`;
    let pdfUrl: string | null = null;
    try {
      const { error: upErr } = await db.storage.from('reports').upload(path, pdf, {
        contentType: 'application/pdf', upsert: true,
      });
      if (!upErr) pdfUrl = db.storage.from('reports').getPublicUrl(path).data.publicUrl;
    } catch { /* storage not provisioned */ }

    if (!integrations.resend) {
      await db.from('donor_tax_packs').upsert({
        donor_email: g.email,
        donor_name: g.name,
        donor_pan: g.pan,
        fiscal_year_start: fy.start.toISOString().slice(0, 10),
        fiscal_year_end: fy.end.toISOString().slice(0, 10),
        total_amount: g.total,
        donation_count: g.rows.length,
        pdf_url: pdfUrl,
        email_status: 'no_email_provider',
        emailed_to: null,
      }, { onConflict: 'donor_email,fiscal_year_start' });
      out.push({ donor_email: g.email, donation_count: g.rows.length, total: g.total, status: 'no_email_provider', pdf_url: pdfUrl });
      continue;
    }

    try {
      await sendEmail({
        to: g.email,
        subject: `Your 80G Annual Donation Statement · ${fy.label}`,
        html: donorPackEmail(g, fy),
        attachments: [{
          filename: `80G_Statement_${fy.label.replace(/\s+/g, '_')}.pdf`,
          content: pdf,
        }],
      });
      await db.from('donor_tax_packs').upsert({
        donor_email: g.email,
        donor_name: g.name,
        donor_pan: g.pan,
        fiscal_year_start: fy.start.toISOString().slice(0, 10),
        fiscal_year_end: fy.end.toISOString().slice(0, 10),
        total_amount: g.total,
        donation_count: g.rows.length,
        pdf_url: pdfUrl,
        emailed_at: new Date().toISOString(),
        emailed_to: g.email,
        email_status: 'sent',
      }, { onConflict: 'donor_email,fiscal_year_start' });
      out.push({ donor_email: g.email, donation_count: g.rows.length, total: g.total, status: 'sent', pdf_url: pdfUrl });
    } catch (e: unknown) {
      const err = (e as Error)?.message ?? String(e);
      await db.from('donor_tax_packs').upsert({
        donor_email: g.email,
        donor_name: g.name,
        donor_pan: g.pan,
        fiscal_year_start: fy.start.toISOString().slice(0, 10),
        fiscal_year_end: fy.end.toISOString().slice(0, 10),
        total_amount: g.total,
        donation_count: g.rows.length,
        pdf_url: pdfUrl,
        email_status: 'failed',
        email_error: err.slice(0, 500),
      }, { onConflict: 'donor_email,fiscal_year_start' });
      out.push({ donor_email: g.email, donation_count: g.rows.length, total: g.total, status: 'failed', error: err });
    }
  }
  return out;
}

function donorPackEmail(g: DonorGroup, fy: FiscalYear): string {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="background:#1e3a8a;padding:20px;color:#fff;border-radius:8px 8px 0 0;text-align:center">
      <h1 style="margin:0;font-size:20px">Lions Club of Baroda Rising Star</h1>
      <p style="margin:4px 0 0;font-size:12px;opacity:0.9">District 3232 F1</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;padding:20px;border-radius:0 0 8px 8px">
      <p>Dear ${esc(g.name)},</p>
      <p>Thank you for your generosity during <strong>${esc(fy.label)}</strong>.
      Attached is your consolidated 80G annual statement, summarising every
      donation you made to the Lions Club of Baroda Rising Star during the
      financial year (1 April – 31 March).</p>
      <ul style="font-size:14px;line-height:1.6">
        <li>Total contributed: <strong>${formatINR(g.total)}</strong></li>
        <li>Number of receipts: <strong>${g.rows.length}</strong></li>
        ${g.pan ? `<li>PAN on file: <strong>${esc(g.pan)}</strong></li>` : ''}
      </ul>
      <p>Please keep this statement with your tax records. Donations to the
      Lions Club may qualify for tax exemption under Section 80G of the
      Income Tax Act, 1961 (subject to applicable conditions).</p>
      <p style="margin-top:20px;font-size:12px;color:#6b7280">
        If anything looks off — wrong PAN, missing donation, name typo —
        reply to this email and we'll fix it.
      </p>
      <p style="margin-top:20px;font-size:12px;color:#6b7280">
        <a href="${base}" style="color:#1e3a8a">${base}</a>
      </p>
    </div>
  </div>`;
}
