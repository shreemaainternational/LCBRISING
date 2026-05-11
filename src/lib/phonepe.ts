import { createHash } from 'node:crypto';
import { env } from '@/lib/env';

const PROD_HOST = 'https://api.phonepe.com/apis/hermes';
const UAT_HOST = 'https://api-preprod.phonepe.com/apis/pg-sandbox';

function host(): string {
  return env.PHONEPE_MERCHANT_ID?.startsWith('PGTESTPAY') ? UAT_HOST : PROD_HOST;
}

function isConfigured(): boolean {
  return Boolean(env.PHONEPE_MERCHANT_ID && env.PHONEPE_SALT_KEY);
}

function xVerify(payloadBase64: string, path: string): string {
  const saltKey = env.PHONEPE_SALT_KEY!;
  const idx = env.PHONEPE_SALT_INDEX ?? '1';
  const digest = createHash('sha256').update(payloadBase64 + path + saltKey).digest('hex');
  return `${digest}###${idx}`;
}

function xVerifyStatus(path: string): string {
  const saltKey = env.PHONEPE_SALT_KEY!;
  const idx = env.PHONEPE_SALT_INDEX ?? '1';
  const digest = createHash('sha256').update(path + saltKey).digest('hex');
  return `${digest}###${idx}`;
}

export interface InitiateInput {
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number;
  redirectUrl: string;
  callbackUrl: string;
  mobile?: string;
}

export interface InitiateResult {
  success: boolean;
  redirectUrl?: string;
  transactionId?: string;
  raw: unknown;
  error?: string;
}

/**
 * Initiate a PhonePe PG transaction (PAY_PAGE flow). PhonePe hosts the
 * payment page (showing a per-transaction QR + UPI buttons) and POSTs to
 * `callbackUrl` on completion. Returns the URL to redirect the user to.
 */
export async function initiatePayment(input: InitiateInput): Promise<InitiateResult> {
  if (!isConfigured()) {
    return { success: false, raw: null, error: 'PhonePe not configured' };
  }
  const payload = {
    merchantId: env.PHONEPE_MERCHANT_ID,
    merchantTransactionId: input.merchantTransactionId,
    merchantUserId: input.merchantUserId,
    amount: Math.round(input.amount * 100),
    redirectUrl: input.redirectUrl,
    redirectMode: 'REDIRECT',
    callbackUrl: input.callbackUrl,
    mobileNumber: input.mobile,
    paymentInstrument: { type: 'PAY_PAGE' },
  };
  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const path = '/pg/v1/pay';

  let json: unknown;
  try {
    const res = await fetch(`${host()}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'X-VERIFY': xVerify(base64, path),
      },
      body: JSON.stringify({ request: base64 }),
    });
    json = await res.json();
  } catch (e) {
    return { success: false, raw: null, error: e instanceof Error ? e.message : 'network error' };
  }

  const j = json as {
    success?: boolean;
    code?: string;
    message?: string;
    data?: { merchantTransactionId?: string; instrumentResponse?: { redirectInfo?: { url?: string } } };
  };

  if (!j.success) {
    return { success: false, raw: json, error: j.message ?? j.code ?? 'phonepe error' };
  }

  return {
    success: true,
    redirectUrl: j.data?.instrumentResponse?.redirectInfo?.url,
    transactionId: j.data?.merchantTransactionId,
    raw: json,
  };
}

export interface StatusResult {
  state: 'PENDING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';
  utr?: string;
  vpa?: string;
  amount?: number;
  raw: unknown;
  error?: string;
}

export async function checkStatus(merchantTransactionId: string): Promise<StatusResult> {
  if (!isConfigured()) {
    return { state: 'UNKNOWN', raw: null, error: 'PhonePe not configured' };
  }
  const path = `/pg/v1/status/${env.PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
  let json: unknown;
  try {
    const res = await fetch(`${host()}${path}`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'X-VERIFY': xVerifyStatus(path),
        'X-MERCHANT-ID': env.PHONEPE_MERCHANT_ID!,
      },
    });
    json = await res.json();
  } catch (e) {
    return { state: 'UNKNOWN', raw: null, error: e instanceof Error ? e.message : 'network error' };
  }
  const j = json as {
    success?: boolean;
    code?: string;
    data?: {
      state?: string;
      amount?: number;
      paymentInstrument?: { utr?: string; vpa?: string };
    };
  };
  const state = (j.data?.state ?? 'UNKNOWN') as StatusResult['state'];
  return {
    state,
    utr: j.data?.paymentInstrument?.utr,
    vpa: j.data?.paymentInstrument?.vpa,
    amount: j.data?.amount ? j.data.amount / 100 : undefined,
    raw: json,
  };
}

export const phonepeConfigured = isConfigured;
