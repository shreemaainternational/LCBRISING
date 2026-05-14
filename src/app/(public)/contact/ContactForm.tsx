'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

const TOPICS = [
  'General Inquiry',
  'Volunteer With Us',
  'Membership',
  'Partnership',
  'Donation',
  'Media & Press',
  'Other',
];

type State = 'idle' | 'pending' | 'sent' | 'error';

export function ContactForm() {
  const [state, setState] = useState<State>('idle');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('pending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          message: `[${subject}]\n\n${message}`,
        }),
      });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
        <p className="font-semibold text-green-800">Message sent — thank you!</p>
        <p className="text-sm text-green-700 mt-1">
          We&apos;ll get back to you within 24 hours.
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full h-11 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400';
  const labelClass = 'block text-sm font-semibold text-navy-800 mb-1.5';

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass} htmlFor="firstName">
            First Name *
          </label>
          <input
            id="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">
            Last Name *
          </label>
          <input
            id="lastName"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="email">
          Email Address *
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="subject">
          Subject *
        </label>
        <select
          id="subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Select a topic
          </option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="message">
          Message *
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help you?"
          className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600">
          Something went wrong — please try again or email us directly.
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'pending'}
        className="btn-navy w-full h-12 inline-flex items-center justify-center gap-2 rounded-md disabled:opacity-60"
      >
        <Send size={16} aria-hidden />
        {state === 'pending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
