import { env } from '@/lib/env';

export type UpiLinkInput = {
  vpa?: string;
  payeeName?: string;
  amount?: number;
  invoiceNo?: string;
  note?: string;
  merchantCode?: string;
};

export function getUpiConfig() {
  return {
    vpa: env.UPI_VPA ?? '',
    payeeName: env.UPI_PAYEE_NAME ?? env.NEXT_PUBLIC_SITE_NAME ?? 'Merchant',
    merchantCode: env.UPI_MERCHANT_CODE ?? '',
  };
}

function clean(value: string) {
  return value.replace(/[^a-zA-Z0-9 .,&_+\-:/@]/g, '').slice(0, 60);
}

export function buildUpiString(input: UpiLinkInput = {}): string {
  const cfg = getUpiConfig();
  const vpa = input.vpa ?? cfg.vpa;
  if (!vpa) {
    return '';
  }
  const params = new URLSearchParams();
  params.set('pa', vpa);
  params.set('pn', clean(input.payeeName ?? cfg.payeeName));
  if (input.amount && input.amount > 0) {
    params.set('am', input.amount.toFixed(2));
  }
  params.set('cu', 'INR');
  if (input.invoiceNo) {
    params.set('tr', clean(input.invoiceNo));
  }
  if (input.note) {
    params.set('tn', clean(input.note));
  }
  if (input.merchantCode ?? cfg.merchantCode) {
    params.set('mc', input.merchantCode ?? cfg.merchantCode);
  }
  return `upi://pay?${params.toString()}`;
}

export function buildPhonePeIntent(input: UpiLinkInput = {}): string {
  const upi = buildUpiString(input);
  if (!upi) return '';
  return upi.replace('upi://', 'phonepe://');
}

export function buildGpayIntent(input: UpiLinkInput = {}): string {
  const upi = buildUpiString(input);
  if (!upi) return '';
  return upi.replace('upi://', 'tez://upi/');
}

export function buildPaytmIntent(input: UpiLinkInput = {}): string {
  const upi = buildUpiString(input);
  if (!upi) return '';
  return upi.replace('upi://', 'paytmmp://');
}
