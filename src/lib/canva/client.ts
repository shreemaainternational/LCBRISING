import { CANVA_TEMPLATES, type CanvaTemplateKey } from '@/templates/config';
import { getCanvaAccessToken } from '@/lib/canva/config';

const CANVA_BASE = 'https://api.canva.com/rest/v1';

async function canvaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Resource endpoints require a per-account OAuth *access token* (Bearer).
  // getCanvaAccessToken() returns the env static token when set, otherwise
  // the connect-flow token, auto-refreshing on expiry. Throws a
  // descriptive error when Canva is not connected.
  const token = await getCanvaAccessToken();
  const res = await fetch(`${CANVA_BASE}${path}`, {
    ...init,
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Canva ${res.status} on ${path}: ${body.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Kick off a Brand Template Autofill — Canva renders the design
 * asynchronously, so this returns a job_id we poll later.
 */
export async function createAutofillJob(args: {
  templateKey: CanvaTemplateKey;
  data: Record<string, unknown>;
  title?: string;
}): Promise<{ jobId: string; designId?: string; templateId: string }> {
  const tpl = CANVA_TEMPLATES[args.templateKey];

  const merged = Object.fromEntries(
    Object.entries(args.data).map(([k, v]) => {
      if (v == null) return [k, { type: 'text', text: '' }];
      if (typeof v === 'string' && /^https?:\/\/.+\.(png|jpg|jpeg|webp)/i.test(v)) {
        return [k, { type: 'image', asset_id: v }];
      }
      return [k, { type: 'text', text: String(v) }];
    }),
  );

  const body = {
    brand_template_id: tpl.id,
    title: args.title ?? `${args.templateKey} - ${new Date().toISOString()}`,
    data: merged,
  };

  const res = await canvaFetch<{ job: { id: string; design?: { id: string } } }>(
    '/autofills', { method: 'POST', body: JSON.stringify(body) },
  );

  return { jobId: res.job.id, designId: res.job.design?.id, templateId: tpl.id };
}

export async function getAutofillJob(jobId: string) {
  return canvaFetch<{
    job: { id: string; status: 'in_progress' | 'success' | 'failed';
           design?: { id: string; thumbnail?: { url: string }; urls?: { edit_url: string; view_url: string } };
           error?: { code: string; message: string } };
  }>(`/autofills/${jobId}`);
}

/**
 * Export a finished design as PNG/JPG/PDF.
 */
export async function exportDesign(designId: string, format: 'png' | 'jpg' | 'pdf' = 'png') {
  const res = await canvaFetch<{ job: { id: string; status: string; urls?: string[] } }>(
    '/exports',
    {
      method: 'POST',
      body: JSON.stringify({
        design_id: designId,
        format: { type: format },
      }),
    },
  );
  return res.job;
}

export async function getExportJob(jobId: string) {
  return canvaFetch<{ job: { id: string; status: string; urls?: string[] } }>(`/exports/${jobId}`);
}
