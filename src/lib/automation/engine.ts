import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, emailTemplates } from '@/lib/email';
import { resolveEmailTemplate, resolveWhatsAppTemplate } from '@/lib/templates';
import { sendWhatsApp, whatsappTemplates } from '@/lib/whatsapp';
import { renderDonationReceipt } from '@/lib/pdf';
import { formatDate } from '@/lib/utils';
import { env } from '@/lib/env';
import { getPrefsForPhone } from '@/lib/customer-prefs';
import { generateContent } from '@/lib/ai/openai';
import { createAutofillJob, getAutofillJob, exportDesign, getExportJob } from '@/lib/canva/client';
import { loadCanvaRuntime } from '@/lib/canva/config';
import { dispatchToPlatform, type Platform } from '@/lib/social/dispatcher';
import { integrations } from '@/lib/env';

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Record<string, JobHandler> = {
  send_welcome_email: async (payload) => {
    const email = String(payload.email);
    const supabase = createAdminClient();
    const { data: member } = await supabase
      .from('members').select('name').eq('email', email).maybeSingle();
    const name = member?.name ?? email;
    const tpl = await resolveEmailTemplate('welcome', { name }, () => emailTemplates.welcome(name));
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
    const emailTpl = await resolveEmailTemplate(
      'dues_reminder',
      { name: member.name, amount: dues.amount, due_date: due },
      () => emailTemplates.duesReminder(member.name, dues.amount, due),
    );
    await sendEmail({ to: member.email, ...emailTpl });
    await logComm(member.email, 'email', 'dues_reminder', emailTpl.subject);

    if (member.phone) {
      const msg = await resolveWhatsAppTemplate(
        'dues_reminder',
        { name: member.name, amount: dues.amount, due_date: due },
        () => whatsappTemplates.duesReminder(member.name, dues.amount, due),
      );
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

    const tpl = await resolveEmailTemplate(
      'donation_receipt',
      { name: donation.donor_name, amount: donation.amount, receipt_no: donation.receipt_no ?? donation.id },
      () => emailTemplates.donationReceipt(donation.donor_name, donation.amount, donation.receipt_no ?? donation.id),
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
      const tpl = await resolveEmailTemplate(
        'event_reminder',
        { name, event: event.title, when, location: event.location ?? 'TBA' },
        () => emailTemplates.eventReminder(name, event.title, when, event.location ?? 'TBA'),
      );
      await sendEmail({ to: target, ...tpl });
      await logComm(target, 'email', 'event_reminder', tpl.subject);
      if (m?.phone) {
        try {
          const msg = await resolveWhatsAppTemplate(
            'event_reminder',
            { name, event: event.title, when, location: event.location ?? 'TBA' },
            () => whatsappTemplates.eventReminder(name, event.title, when, event.location ?? 'TBA'),
          );
          await sendWhatsApp(m.phone, msg);
          await logComm(m.phone, 'whatsapp', 'event_reminder', msg);
        } catch (err) {
          console.error('whatsapp send failed', err);
        }
      }
    }
  },

  send_invoice_reminder: async (payload) => {
    const invoiceId = String(payload.invoice_id);
    const tier = Number(payload.tier ?? 0);
    const supabase = createAdminClient();
    const { data: inv } = await supabase
      .from('invoices')
      .select('id, invoice_no, customer_name, customer_email, customer_phone, amount, status')
      .eq('id', invoiceId)
      .maybeSingle();
    if (!inv) return;
    if (inv.status === 'paid' || inv.status === 'cancelled') return;

    const prefs = await getPrefsForPhone(inv.customer_phone);
    if (!prefs.reminders_enabled) return;

    const payUrl = `${env.NEXT_PUBLIC_SITE_URL}/pay/${inv.id}`;

    if (inv.customer_email && prefs.email_enabled) {
      try {
        await sendEmail({
          to: inv.customer_email,
          subject: `Reminder: invoice ${inv.invoice_no} – ₹${inv.amount}`,
          html: `
            <p>Dear ${inv.customer_name},</p>
            <p>This is a friendly reminder that invoice <strong>${inv.invoice_no}</strong>
            for <strong>₹${inv.amount}</strong> is awaiting payment.</p>
            <p><a href="${payUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Pay now</a></p>
            <p>Thank you,<br/>Lions Club of Baroda Rising Star</p>
          `,
        });
        await logComm(inv.customer_email, 'email', 'invoice_reminder', `tier=${tier}`);
      } catch (err) {
        console.error('invoice reminder email failed', err);
      }
    }

    if (inv.customer_phone && prefs.whatsapp_enabled) {
      try {
        await sendWhatsApp(
          inv.customer_phone,
          whatsappTemplates.paymentRequest(inv.customer_name, Number(inv.amount), inv.invoice_no, payUrl),
        );
        await logComm(inv.customer_phone, 'whatsapp', 'invoice_reminder', `tier=${tier}`);
      } catch (err) {
        console.error('invoice reminder whatsapp failed', err);
      }
    }

    await supabase.from('payment_audit_logs').insert({
      invoice_id: inv.id,
      actor_kind: 'system',
      action: 'reminder_sent',
      detail: { tier, payUrl },
    });
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

    // Canva is usable when connected via env token OR the OAuth connect
    // flow (DB) — check the runtime, not just the env-derived flag.
    const canvaReady = (await loadCanvaRuntime()).connected;
    if (canvaReady) {
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
  send_meeting_reminder: async (payload) => {
    const eventId = String(payload.event_id);
    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('events')
      .select('id, title, date, location, club_id')
      .eq('id', eventId)
      .maybeSingle();
    if (!event) return;

    const memberQuery = supabase
      .from('members')
      .select('id, name, email, phone, whatsapp')
      .is('deleted_at', null);
    const { data: members } = event.club_id
      ? await memberQuery.eq('club_id', event.club_id)
      : await memberQuery;

    const when = formatDate(event.date);
    for (const m of members ?? []) {
      const subject = `Reminder: ${event.title} on ${when}`;
      if (m.email) {
        await sendEmail({
          to: m.email,
          subject,
          html: `<p>Hi ${m.name},</p><p>Just a reminder for <strong>${event.title}</strong> on ${when}${event.location ? ` at ${event.location}` : ''}.</p>`,
        });
        await logComm(m.email, 'email', 'meeting_reminder', subject);
      }
      const wa = m.whatsapp || m.phone;
      if (wa) {
        try {
          const msg = await resolveWhatsAppTemplate(
            'meeting_reminder',
            { name: m.name, event: event.title, when, location: event.location ?? '' },
            () => whatsappTemplates.eventReminder(m.name, event.title, when, event.location ?? ''),
          );
          await sendWhatsApp(wa, msg);
          await logComm(wa, 'whatsapp', 'meeting_reminder', event.title);
        } catch (err) { console.error('meeting WA failed', err); }
      }
    }
  },

  notify_officer_appointment: async (payload) => {
    const officerId = String(payload.officer_id);
    const supabase = createAdminClient();
    const { data: officer } = await supabase
      .from('officers')
      .select('id, role, term_start, term_end, scope_kind, members(name, email, whatsapp, phone)')
      .eq('id', officerId)
      .maybeSingle();
    if (!officer) return;
    const m = (officer as unknown as { members: { name: string; email: string; whatsapp: string | null; phone: string | null } }).members;
    if (!m) return;
    const subject = `You've been appointed as ${officer.role}`;
    if (m.email) {
      await sendEmail({
        to: m.email,
        subject,
        html: `<p>Congratulations, ${m.name}.</p><p>Your appointment as <strong>${officer.role}</strong> (${officer.scope_kind}) begins ${officer.term_start}.</p>`,
      });
      await logComm(m.email, 'email', 'officer_appointment', subject);
    }
    const wa = m.whatsapp || m.phone;
    if (wa) {
      try {
        const msg = await resolveWhatsAppTemplate(
          'officer_appointment',
          { name: m.name, role: officer.role, term_start: officer.term_start },
          () => `🦁 Congratulations ${m.name}! You've been appointed as ${officer.role} effective ${officer.term_start}.`,
        );
        await sendWhatsApp(wa, msg);
        await logComm(wa, 'whatsapp', 'officer_appointment', officer.role);
      } catch (err) { console.error('officer WA failed', err); }
    }
  },

  /**
   * Weekly leadership digest — a 7-day summary (activities, lives reached,
   * funds raised, new members, upcoming events) emailed (and WhatsApp'd)
   * to every officer-level member.
   */
  send_officer_digest: async () => {
    const supabase = createAdminClient();
    const now = Date.now();
    const weekAgoIso = new Date(now - 7 * 86_400_000).toISOString();
    const in14Iso = new Date(now + 14 * 86_400_000).toISOString();

    const [{ data: acts }, { data: dons }, { count: newMembers }, { data: events }, { data: officers }] =
      await Promise.all([
        supabase.from('activities').select('beneficiaries').gte('created_at', weekAgoIso),
        supabase.from('donations').select('amount').gte('created_at', weekAgoIso),
        supabase.from('members').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoIso).is('deleted_at', null),
        supabase.from('events').select('title, date').gte('date', new Date(now).toISOString()).lte('date', in14Iso).order('date').limit(8),
        supabase
          .from('members')
          .select('name, email, phone, whatsapp')
          .in('role', ['officer', 'treasurer', 'secretary', 'president', 'admin'])
          .eq('status', 'active')
          .is('deleted_at', null),
      ]);

    const beneficiaries = (acts ?? []).reduce((s, a) => s + Number(a.beneficiaries ?? 0), 0);
    const donations = (dons ?? []).reduce((s, d) => s + Number(d.amount ?? 0), 0);
    const periodLabel = `${formatDate(weekAgoIso)} – ${formatDate(new Date(now).toISOString())}`;
    const stats = {
      periodLabel,
      activities: (acts ?? []).length,
      beneficiaries,
      donations,
      newMembers: newMembers ?? 0,
      events: (events ?? []).map((e) => ({ title: e.title as string, when: formatDate(e.date) })),
    };

    for (const o of officers ?? []) {
      if (!o.email) continue;
      const tpl = emailTemplates.officerDigest(o.name, stats);
      await sendEmail({ to: o.email, ...tpl });
      await logComm(o.email, 'email', 'officer_digest', tpl.subject);
      const wa = o.whatsapp || o.phone;
      if (wa) {
        try {
          const msg = `🦁 Weekly digest (${periodLabel}): ${stats.activities} activities · ${beneficiaries.toLocaleString('en-IN')} lives reached · ₹${donations.toLocaleString('en-IN')} raised · ${stats.newMembers} new members. ${stats.events.length} upcoming events.`;
          await sendWhatsApp(wa, msg);
          await logComm(wa, 'whatsapp', 'officer_digest', 'weekly');
        } catch (err) { console.error('digest WA failed', err); }
      }
    }
  },

  /**
   * Daily anniversary sweep — greets members on the anniversary of the day
   * they joined, with a years-of-service count. Honours the 'anniversary'
   * template override for both channels.
   */
  send_anniversary_sweep: async () => {
    const supabase = createAdminClient();
    const { data: rows } = await supabase.from('upcoming_anniversaries').select('*');
    if (!rows) return;
    const today = new Date();
    const md = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yearNow = today.getFullYear();

    for (const m of rows.filter((x) => x.md === md)) {
      const years = m.joined_year ? Math.max(0, yearNow - Number(m.joined_year)) : 0;
      if (years < 1) continue; // skip members who joined this same year

      if (m.email) {
        const tpl = await resolveEmailTemplate(
          'anniversary',
          { name: m.name, years },
          () => emailTemplates.anniversary(m.name, years),
        );
        await sendEmail({ to: m.email, ...tpl });
        await logComm(m.email, 'email', 'anniversary', tpl.subject);
      }
      const wa = m.whatsapp || m.phone;
      if (wa) {
        try {
          const msg = await resolveWhatsAppTemplate(
            'anniversary',
            { name: m.name, years },
            () => whatsappTemplates.anniversary(m.name, years),
          );
          await sendWhatsApp(wa, msg);
          await logComm(wa, 'whatsapp', 'anniversary', m.name);
        } catch (err) { console.error('anniversary WA failed', err); }
      }
    }
  },

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
          const msg = await resolveWhatsAppTemplate(
            'birthday',
            { name: m.name },
            () => `🎂 Happy birthday, ${m.name}! Wishing you health, happiness, and continued service. 🦁 — Lions Club Baroda Rising Star`,
          );
          await sendWhatsApp(m.phone, msg);
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

/**
 * Enqueue the daily birthday + anniversary greeting sweeps. Guarded so each
 * sweep is enqueued at most once per day even if the scheduler runs more than
 * once. The handlers themselves match today's date, so this only queues them.
 */
export async function scheduleDailyGreetings(): Promise<{ birthday: number; anniversary: number }> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 20 * 3_600_000).toISOString();
  const out = { birthday: 0, anniversary: 0 };
  for (const jobType of ['daily_birthday_sweep', 'send_anniversary_sweep'] as const) {
    const { data: recent } = await supabase
      .from('automation_jobs')
      .select('id')
      .eq('job_type', jobType)
      .gte('created_at', since)
      .limit(1);
    if (recent && recent.length > 0) continue;
    await enqueueJob(jobType, {});
    if (jobType === 'daily_birthday_sweep') out.birthday = 1;
    else out.anniversary = 1;
  }
  return out;
}

/**
 * Enqueue the weekly officer digest, at most once every 6 days. Safe to
 * call from a daily/hourly scheduler — the guard checks the communications
 * log for the last digest and only queues a new one when a week has passed.
 */
export async function scheduleOfficerDigest(): Promise<number> {
  const supabase = createAdminClient();
  const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString();
  const { data: recent } = await supabase
    .from('communications')
    .select('id')
    .eq('template', 'officer_digest')
    .gte('sent_at', sixDaysAgo)
    .limit(1);
  if (recent && recent.length > 0) return 0;
  await enqueueJob('send_officer_digest', {});
  return 1;
}

/**
 * Mark invoices past their expires_at as 'expired'. Runs daily.
 */
export async function expireStaleInvoices(): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: stale } = await supabase
    .from('invoices')
    .select('id')
    .in('status', ['sent', 'partial', 'draft'])
    .not('expires_at', 'is', null)
    .lt('expires_at', now)
    .is('deleted_at', null);
  if (!stale || stale.length === 0) return 0;
  const ids = stale.map((s) => s.id);
  await supabase.from('invoices').update({ status: 'expired' }).in('id', ids);
  for (const id of ids) {
    await supabase.from('payment_audit_logs').insert({
      invoice_id: id,
      actor_kind: 'system',
      action: 'invoice_expired',
      detail: { source: 'cron' },
    });
  }
  return ids.length;
}

/**
 * Generate fresh invoices from active recurring templates that are due.
 */
export async function runRecurringInvoices(): Promise<number> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: templates } = await supabase
    .from('recurring_invoices')
    .select('*')
    .eq('active', true)
    .lte('next_run_at', today);

  let generated = 0;
  for (const t of templates ?? []) {
    if (t.end_at && t.end_at < today) {
      await supabase.from('recurring_invoices').update({ active: false }).eq('id', t.id);
      continue;
    }
    const invoiceNo = `INV-${String(new Date().getFullYear()).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900000) + 100000}`;
    const { data: inv } = await supabase
      .from('invoices')
      .insert({
        invoice_no: invoiceNo,
        customer_name: t.customer_name,
        customer_email: t.customer_email,
        customer_phone: t.customer_phone,
        amount: t.amount,
        description: t.description,
        metadata: { recurring_id: t.id, ...t.metadata },
        status: 'sent',
      })
      .select('id')
      .single();
    if (inv) {
      generated += 1;
      if (t.send_whatsapp && t.customer_phone) {
        await enqueueJob('send_invoice_reminder', { invoice_id: inv.id, tier: 0 });
      } else if (t.send_email && t.customer_email) {
        await enqueueJob('send_invoice_reminder', { invoice_id: inv.id, tier: 0 });
      }
      const next = advance(t.next_run_at, t.interval);
      await supabase.from('recurring_invoices').update({ next_run_at: next }).eq('id', t.id);
    }
  }
  return generated;
}

function advance(dateStr: string, interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  const d = new Date(dateStr);
  if (interval === 'weekly') d.setDate(d.getDate() + 7);
  else if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Queue payment reminders for unpaid invoices.
 * Sends at 1 / 3 / 7 days after creation, then weekly, then stops at 30 days.
 */
export async function schedulePaymentReminders() {
  const supabase = createAdminClient();
  const now = Date.now();
  const cutoff30 = new Date(now - 30 * 86_400_000).toISOString();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, created_at, expires_at')
    .in('status', ['sent', 'partial'])
    .gte('created_at', cutoff30)
    .is('deleted_at', null);

  let queued = 0;
  for (const inv of invoices ?? []) {
    if (inv.expires_at && new Date(inv.expires_at).getTime() < now) continue;
    const ageDays = Math.floor((now - new Date(inv.created_at).getTime()) / 86_400_000);
    const tier = ageDays >= 21 ? 21 : ageDays >= 14 ? 14 : ageDays >= 7 ? 7 : ageDays >= 3 ? 3 : ageDays >= 1 ? 1 : null;
    if (tier === null) continue;

    const { data: existing } = await supabase
      .from('payment_audit_logs')
      .select('id')
      .eq('invoice_id', inv.id)
      .eq('action', 'reminder_sent')
      .contains('detail', { tier })
      .maybeSingle();
    if (existing) continue;

    await enqueueJob('send_invoice_reminder', { invoice_id: inv.id, tier });
    queued += 1;
  }
  return queued;
}
