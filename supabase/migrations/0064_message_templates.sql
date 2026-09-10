-- =====================================================================
-- Reusable message templates, editable from the CRM (Communications).
-- Officers can save named email/WhatsApp copy and load it into the
-- broadcast composer without a code deploy.
-- =====================================================================

create table if not exists public.message_templates (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  label text not null,
  channel text not null default 'both',   -- 'email' | 'whatsapp' | 'both'
  subject text,
  body text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_message_templates_label on public.message_templates(label);

alter table public.message_templates enable row level security;

do $$ begin
  create policy message_templates_admin_all on public.message_templates
    for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

-- A few starter templates so the editor is not empty on first open.
insert into public.message_templates (key, label, channel, subject, body) values
  ('thank_you_donor', 'Thank-you to donor', 'both',
   'Thank you for supporting Baroda Rising Star',
   'Dear {{name}},\n\nThank you for your generous contribution. Your support directly powers our service projects across Vadodara.\n\nWith gratitude,\nLions Club of Baroda Rising Star'),
  ('event_invite', 'Event invitation', 'both',
   'You are invited: {{event}}',
   'Dear {{name}},\n\nYou are warmly invited to {{event}} on {{date}} at {{location}}. We would love to have you join us.\n\nWe Serve,\nLions Club of Baroda Rising Star'),
  ('volunteer_call', 'Volunteer call-out', 'both',
   'Lend a hand this week',
   'Hello {{name}},\n\nWe are looking for volunteers for our upcoming service activity. No experience needed — just a willingness to serve. Reply to sign up!\n\nLions Club of Baroda Rising Star')
on conflict (key) do nothing;
