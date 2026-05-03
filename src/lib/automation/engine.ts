import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, emailTemplates } from '@/lib/email';
import { sendWhatsApp, whatsappTemplates } from '@/lib/whatsapp';
import { renderDonationReceipt } from '@/lib/pdf';
import { formatDate } from '@/lib/utils';
import { generateContent } from '@/lib/ai/openai';
import { createAutofillJob, getAutofillJob, exportDesign, getExportJob } from '@/lib/canva/client';
import { dispatchToPlatform, type Platform } from '@/lib/social/dispatcher';
import { integrations } from '@/lib/env';

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Record<string, JobHandler> = {
  send_welcome_email: async (payload) => {
    const email = String(payload.email);
    const supabase = createAdminClient();
    const { data: member } = await supabase
      .from('members').select('name').eq('email', email).maybeSingle();
    const tpl = emailTemplates.welcome(member?.name ?? email);
    await sendEmail({ to: email, ...tpl });
    await logComm(email, 'email', 'welcome', tpl.subject);
  },

  send_dues_reminder: async (payload) => {
    const duesId = String(payload.dues_id);
    const supabase = createAdminClient();
    const { data: dues } = await supabase
      .from('dues')
      .select('amount, due_date, members(name, email, phone)')
      .eq('id', duesId)
      .maybeSingle();

    if (!dues) return;
    const member = (dues as unknown as { members: { name: string; email: string; phone: string | null } }).members;
    if (!member) return;

    const due = formatDate(dues.due_date);
    const emailTpl = emailTemplates.duesReminder(member.name, dues.amount, due);
    await sendEmail({ to: member.email, ...emailTpl });
    await logComm(member.email, 'email', 'dues_reminder', emailTpl.subject);

    if (member.phone) {
      const msg = whatsappTemplates.duesReminder(member.name, dues.amount, due);
      try {
        await sendWhatsApp(member.phone, msg);
        await logComm(member.phone, 'whatsapp', 'dues_reminder', msg);
      } catch (err) {
        console.error('whatsapp send failed', err);
      }
    }
  },

  send_donation_receipt: async (payload) => {
    const donationId = String(payload.donation_id);
    const supabase = createAdminClient();
    const { data: donation } = await supabase
      .from('donations').select('*').eq('id', donationId).maybeSingle();
    if (!donation || !donation.donor_email) return;

    const pdf = await renderDonationReceipt({
      receiptNo: donation.receipt_no ?? donation.id,
      donorName: donation.donor_name,
      donorEmail: donation.donor_email,
      donorPan: donation.donor_pan,
      amount: donation.amount,
      campaign: donation.campaign,
      date: donation.created_at,
    });

    const tpl = emailTemplates.donationReceipt(
      donation.donor_name,
      donation.amount,
      donation.receipt_no ?? donation.id,
    );
    await sendEmail({
      to: donation.donor_email,
      ...tpl,
      attachments: [{ filename: `receipt-${donation.receipt_no}.pdf`, content: pdf }],
    });
    await logComm(donation.donor_email, 'email', 'donation_receipt', tpl.subject);
  },

  send_event_reminder: async (payload) => {
    const eventId = String(payload.event_id);
    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('events').select('title, date, location').eq('id', eventId).maybeSingle();
    if (!event) return;
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('member_id, guest_email, members(name, email, phone)')
      .eq('event_id', eventId).eq('status', 'yes');

    const when = formatDate(event.date, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

    for (const r of rsvps ?? []) {
      const m = (r as unknown as { members: { name: string; email: string; phone: string | null } | null }).members;
      const target = m?.email ?? r.guest_email;
      const name = m?.name ?? 'friend';
      if (!target) continue;
      const tpl = emailTemplates.eventReminder(name, event.title, when, event.location ?? 'TBA');
      await sendEmail({ to: target, ...tpl });
      await logComm(target, 'email', 'event_reminder', tpl.subject);
      if (m?.phone) {
        try {
          const msg = whatsappTemplates.eventReminder(name, event.title, when, event.location ?? 'TBA');
          await sendWhatsApp(m.phone, msg);
          await logComm(m.phone, 'whatsapp', 'event_reminder', msg);
        } catch (err) {
          console.error('whatsapp send failed', err);
        }
      }
    }
  },

  // ==================================================================
  // Social + creative handlers
  // ==================================================================

  /**
   * Polls a Canva autofill job. When the design is ready, kicks off an
   * export. When the export is ready, persists the URL on the creative
   * row and (optionally) the linked social post.
   */
  poll_canva_design: async (payload) => {
    const supabase = createAdminClient();
    const creativeId = String(payload.creative_id);
    const jobId = String(payload.job_id);
    const format = (payload.format as 'png' | 'jpg' | 'pdf') ?? 'png';

    const job = await getAutofillJob(jobId);
    if (job.job.status === 'in_progress') {
      // Re-queue ourselves with a backoff
      await enqueueJob('poll_canva_design', payload, new Date(Date.now() + 10_000));
      return;
    }
    if (job.job.status === 'failed' || !job.job.design) {
      await supabase.from('creatives').update({
        status: 'failed', data: { error: job.job.error?.message ?? 'unknown' },
      }).eq('id', creativeId);
      return;
    }

    const exp = await exportDesign(job.job.design.id, format);
    await enqueueJob('poll_canva_export', {
      creative_id: creativeId, export_job_id: exp.id,
      thumbnail_url: job.job.design.thumbnail?.url ?? null,
    }, new Date(Date.now() + 5_000));
  },

  poll_canva_export: async (payload) => {
    const supabase = createAdminClient();
    const creativeId = String(payload.creative_id);
    const exportJobId = String(payload.export_job_id);

    const exp = await getExportJob(exportJobId);
    if (exp.job.status === 'in_progress') {
      await enqueueJob('poll_canva_export', payload, new Date(Date.now() + 10_000));
      return;
    }
    if (!exp.job.urls?.length) {
      await supabase.from('creatives').update({ status: 'failed' }).eq('id', creativeId);
      return;
    }
    await supabase.from('creatives').update({
      status: 'ready',
      output_url: exp.job.urls[0],
      thumbnail_url: payload.thumbnail_url as string | null,
    }).eq('id', creativeId);
  },

  /**
   * Pushes a single queued social post to the right platform.
   */
  publish_social_post: async (payload) => {
    const supabase = createAdminClient();
    const postId = String(payload.post_id);

    const { data: post } = await supabase
      .from('social_posts').select('*').eq('id', postId).maybeSingle();
    if (!post) return;

    let recipients: string[] | undefined;
    if (post.platform === 'whatsapp') {
      const { data: members } = await supabase
        .from('members').select('phone').eq('status', 'active').not('phone', 'is', null);
      recipients = (members ?? []).map((m) => m.phone).filter(Boolean) as string[];
    }

    const result = await dispatchToPlatform(post.platform as Platform, {
      caption: post.caption ?? '',
      hashtags: post.hashtags ?? [],
      media_urls: post.media_urls ?? [],
      whatsapp_recipients: recipients,
    });

    await supabase.from('social_posts').update({
      status: result.ok ? 'published' : 'failed',
      external_post_id: result.external_post_id ?? null,
      external_url: result.external_url ?? null,
      published_at: result.ok ? new Date().toISOString() : null,
      last_error: result.error ?? null,
    }).eq('id', postId);
  },

  /**
   * On a new activity, generate caption + hashtags + flyer and queue
   * posts for every connected platform.
   */
  on_activity_created: async (payload) => {
    const supabase = createAdminClient();
    const activityId = String(payload.activity_id);
    const { data: activity } = await supabase
      .from('activities').select('*').eq('id', activityId).maybeSingle();
    if (!activity) return;

    if (!integrations.openai) return;          // skip until configured
    const { content } = await generateContent({
      type: 'social_post',
      title: activity.title,
      description: activity.description ?? undefined,
      location: activity.location ?? undefined,
      tone: 'inspirational',
      language: 'en',
    });

    if (integrations.canva) {
      const job = await createAutofillJob({
        templateKey: 'flyer',
        data: {
          headline: activity.title,
          subheading: formatDate(activity.date),
          body: activity.description ?? '',
          location: activity.location ?? 'Vadodara',
          cta: 'We Serve',
        },
        title: `flyer - ${activity.title}`,
      });
      const { data: creative } = await supabase
        .from('creatives').insert({
          template_type: 'flyer',
          template_id: job.templateId,
          external_id: job.designId ?? job.jobId,
          activity_id: activityId,
          status: 'rendering',
          source: 'canva',
        }).select('id').single();
      if (creative) {
        await enqueueJob('poll_canva_design', {
          creative_id: creative.id, job_id: job.jobId,
          design_id: job.designId, format: 'png',
        }, new Date(Date.now() + 5_000));
      }
    }

    const platforms = (['facebook','instagram','linkedin','whatsapp'] as Platform[])
      .filter((p) => p === 'whatsapp'
        ? integrations.whatsappBusiness || integrations.twilio
        : integrations[p as 'facebook' | 'instagram' | 'linkedin']);

    for (const platform of platforms) {
      const { data: row } = await supabase.from('social_posts').insert({
        platform,
        caption: content.caption ?? content.body ?? activity.title,
        hashtags: content.hashtags ?? ['LionsClubs','WeServe','Vadodara'],
        activity_id: activityId,
        status: 'queued',
      }).select('id').single();
      if (row) await enqueueJob('publish_social_post', { post_id: row.id });
    }
  },

  /**
   * On a captured donation, generate a thank-you post.
   */
  on_donation_received: async (payload) => {
    const donationId = String(payload.donation_id);
    const supabase = createAdminClient();
    const { data: donation } = await supabase
      .from('donations').select('*').eq('id', donationId).maybeSingle();
    if (!donation || donation.is_anonymous) return;
    if (!integrations.openai) return;

    const { content } = await generateContent({
      type: 'social_post',
      title: `Thank you to ${donation.donor_name}`,
      description: `Donation of ₹${donation.amount} for ${donation.campaign ?? 'service projects'}.`,
      tone: 'celebratory',
    });

    const platforms = (['facebook','instagram','linkedin'] as const)
      .filter((p) => integrations[p]) as Platform[];
    for (const platform of platforms) {
      const { data: row } = await supabase.from('social_posts').insert({
        platform,
        caption: content.caption ?? content.body ?? '',
        hashtags: content.hashtags ?? ['LionsClubs','ThankYou','WeServe'],
        donation_id: donationId,
        status: 'queued',
      }).select('id').single();
      if (row) await enqueueJob('publish_social_post', { post_id: row.id });
    }
  },

  /**
   * Daily birthday sweep — generates birthday creative + sends WhatsApp
   * to each member whose dob matches today.
   */
  daily_birthday_sweep: async () => {
    const supabase = createAdminClient();
    const { data: members } = await supabase
      .from('upcoming_birthdays').select('*');
    if (!members) return;
    const today = new Date();
    const md = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (const m of members.filter((x) => x.md === md)) {
      if (m.phone) {
        try {
          await sendWhatsApp(
            m.phone,
            `🎂 Happy birthday, ${m.name}! Wishing you health, happiness, and continued service. 🦁 — Lions Club Baroda Rising Star`,
          );
          await logComm(m.phone, 'whatsapp', 'birthday', m.name);
        } catch (err) { console.error('birthday WA failed', err); }
      }
      if (m.email) {
        await sendEmail({
          to: m.email,
          subject: `🎂 Happy birthday, ${m.name}!`,
          html: `<p>Wishing you a wonderful year ahead from your Lions family.</p>`,
        });
        await logComm(m.email, 'email', 'birthday', m.name);
      }
    }
  },
};

async function logComm(recipient: string, channel: string, template: string, body: string) {
  const supabase = createAdminClient();
  await supabase.from('communications').insert({
    recipient, channel, template, body,
    status: 'sent', sent_at: new Date().toISOString(),
  });
}

/**
 * Drain pending automation jobs. Designed for invocation from a cron route.
 */
export async function processJobs(limit = 25) {
  const supabase = createAdminClient();
  const { data: jobs } = await supabase
    .from('automation_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('run_after', new Date().toISOString())
    .order('run_after', { ascending: true })
    .limit(limit);

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const job of jobs ?? []) {
    await supabase.from('automation_jobs')
      .update({ status: 'running', attempts: job.attempts + 1 })
      .eq('id', job.id);

    const handler = handlers[job.job_type];
    if (!handler) {
      await supabase.from('automation_jobs')
        .update({ status: 'failed', last_error: `No handler for ${job.job_type}` })
        .eq('id', job.id);
      results.push({ id: job.id, ok: false, error: 'no_handler' });
      continue;
    }

    try {
      await handler(job.payload as Record<string, unknown>);
      await supabase.from('automation_jobs')
        .update({ status: 'completed' }).eq('id', job.id);
      results.push({ id: job.id, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const failed = job.attempts + 1 >= 5;
      await supabase.from('automation_jobs').update({
        status: failed ? 'failed' : 'pending',
        last_error: msg,
        run_after: new Date(Date.now() + 60_000 * Math.pow(2, job.attempts)).toISOString(),
      }).eq('id', job.id);
      results.push({ id: job.id, ok: false, error: msg });
    }
  }

  return results;
}

/**
 * Enqueue a job to be processed later by the cron worker.
 */
export async function enqueueJob(jobType: string, payload: Record<string, unknown>, runAfter?: Date) {
  const supabase = createAdminClient();
  await supabase.from('automation_jobs').insert({
    job_type: jobType,
    payload,
    run_after: (runAfter ?? new Date()).toISOString(),
  });
}

/**
 * Scan upcoming dues and queue reminder jobs (T-7 days, T-day).
 */
export async function scheduleDuesReminders() {
  const supabase = createAdminClient();
  const today = new Date();
  const in7 = new Date(today.getTime() + 7 * 86_400_000);

  const { data: dues } = await supabase
    .from('dues')
    .select('id, due_date')
    .in('status', ['pending', 'overdue'])
    .lte('due_date', in7.toISOString().slice(0, 10));

  for (const d of dues ?? []) {
    await enqueueJob('send_dues_reminder', { dues_id: d.id });
  }
  return dues?.length ?? 0;
}
