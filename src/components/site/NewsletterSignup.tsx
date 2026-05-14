'use client';

import { useState } from 'react';
import { Mail, Send, Check, CircleCheck } from 'lucide-react';

const PERKS = [
  'Service activity reports & photos',
  'Event invitations & reminders',
  'Community impact stories',
  'Donation & volunteer opportunities',
];

type Channel = 'email' | 'whatsapp';

export function NewsletterSignup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['email']);
  const [state, setState] = useState<'idle' | 'pending' | 'ok' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggleChannel(c: Channel) {
    setChannels((cur) =>
      cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) return;
    setState('pending');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          whatsapp: whatsapp ? `+91${whatsapp.replace(/\D/g, '')}` : undefined,
          channels: channels.length ? channels : ['email'],
          source: 'home_signup',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        setErrorMsg(json.error ?? 'Could not subscribe. Please try again.');
        setState('err');
        return;
      }
      setState('ok');
      setName('');
      setEmail('');
      setWhatsapp('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setState('err');
    }
  }

  return (
    <section className="bg-navy-900 text-white py-16 md:py-24">
      <div className="container-page grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — copy */}
        <div>
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-brand-300 px-3 py-1 rounded-full text-xs font-semibold mb-5">
            <Mail size={12} aria-hidden /> NEWSLETTER
          </span>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-5">
            Stay Connected With{' '}
            <span className="text-brand-400">Our Mission</span>
          </h2>
          <p className="text-gray-300 leading-relaxed mb-6 max-w-lg">
            Get updates on our latest service activities, upcoming events, and
            community impact stories delivered to your inbox and WhatsApp.
          </p>
          <ul className="space-y-3">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-gray-200">
                <CircleCheck size={16} className="text-emerald-400 flex-shrink-0" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — form card */}
        <div className="rounded-2xl bg-navy-800/70 border border-white/10 p-6 md:p-8 shadow-xl">
          {state === 'ok' ? (
            <div className="text-center py-10">
              <div className="flex justify-center mb-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check size={28} />
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">You&rsquo;re subscribed!</h3>
              <p className="text-sm text-gray-300">
                The first issue lands at the start of next month. Watch your
                {channels.includes('whatsapp') ? ' inbox and WhatsApp' : ' inbox'}.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Your Name <span className="text-brand-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full h-11 px-3 rounded-md bg-navy-900/60 border border-white/15 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <Mail size={13} className="inline mb-0.5 mr-1 text-brand-300" aria-hidden />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full h-11 px-3 rounded-md bg-navy-900/60 border border-white/15 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <WhatsAppGlyph /> WhatsApp Number
                </label>
                <div className="flex">
                  <span className="flex items-center px-3 h-11 rounded-l-md bg-navy-900 border border-white/15 border-r-0 text-sm text-gray-300">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="9712299333"
                    className="flex-1 h-11 px-3 rounded-r-md bg-navy-900/60 border border-white/15 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium mb-2">Receive updates via:</span>
                <div className="grid grid-cols-2 gap-3">
                  <ChannelToggle
                    active={channels.includes('email')}
                    onClick={() => toggleChannel('email')}
                    label="Email"
                    icon={<Mail size={15} />}
                  />
                  <ChannelToggle
                    active={channels.includes('whatsapp')}
                    onClick={() => toggleChannel('whatsapp')}
                    label="WhatsApp"
                    icon={<WhatsAppGlyph />}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={state === 'pending' || !name || !email}
                className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-md bg-brand-500 hover:bg-brand-600 text-navy-900 font-semibold disabled:opacity-60 transition-colors"
              >
                {state === 'pending' ? 'Subscribing…' : (
                  <>
                    <Send size={15} aria-hidden /> Subscribe Now
                  </>
                )}
              </button>

              {state === 'err' && errorMsg && (
                <p className="text-sm text-red-300 text-center">{errorMsg}</p>
              )}

              <p className="text-xs text-gray-400 text-center">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function ChannelToggle({
  active, onClick, label, icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 h-12 rounded-md border text-sm font-medium transition-colors ${
        active
          ? 'border-brand-400 bg-brand-500/15 text-brand-300'
          : 'border-white/15 text-gray-300 hover:border-white/30'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Inline WhatsApp glyph — lucide-react 1.x has no WhatsApp icon. */
function WhatsAppGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="inline mb-0.5"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.27-1.38a9.92 9.92 0 0 0 4.77 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.86 9.86 0 0 0 19.07 4.9 9.86 9.86 0 0 0 12.04 2zm5.52 11.97c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.65.8-.8.97-.15.17-.3.19-.55.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.39-1.73-.15-.25-.02-.39.11-.51.11-.11.25-.3.37-.45.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.83-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.43.06-.65.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.13.17 1.74 2.66 4.22 3.73 1.7.73 2.36.79 3.21.66.52-.08 1.47-.6 1.68-1.19.21-.59.21-1.09.15-1.19-.06-.1-.23-.17-.48-.3z" />
    </svg>
  );
}
