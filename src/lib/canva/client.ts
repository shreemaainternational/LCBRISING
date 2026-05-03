import { env, integrations } from '@/lib/env';
import { CANVA_TEMPLATES, type CanvaTemplateKey } from '@/templates/config';

const CANVA_BASE = 'https://api.canva.com/rest/v1';

function authHeader() {
  // Canva Connect: prefer service token; otherwise fall back to OAuth client.
  if (env.CANVA_API_KEY) return `Bearer ${env.CANVA_API_KEY}`;
  if (env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET) {
    const basic = Buffer.from(`${env.CANVA_CLIENT_ID}:${env.CANVA_CLIENT_SECRET}`).toString('base64');
    return `Basic ${basic}`;
  }
  throw new Error('Canva is not configured');
}

async function canvaFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!integrations.canva) throw new Error('Canva is not configured');
  const res = await fetch(`${CANVA_BASE}${path}`, {
    ...init,
    headers: {
      'authorization': authHeader(),
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
