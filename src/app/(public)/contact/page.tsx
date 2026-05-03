import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, MapPin, Phone } from 'lucide-react';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <section className="container-page py-16 max-w-3xl">
      <h1 className="text-4xl font-bold text-navy-800 mb-2">Contact Us</h1>
      <p className="text-gray-600 mb-10">
        Get in touch — for membership, partnerships, or to volunteer.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="mx-auto text-brand-500 mb-2" />
            <div className="font-semibold">Email</div>
            <a href="mailto:contact@lcbrising.org" className="text-sm text-gray-600">contact@lcbrising.org</a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Phone className="mx-auto text-brand-500 mb-2" />
            <div className="font-semibold">Phone</div>
            <div className="text-sm text-gray-600">+91 90000 00000</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="mx-auto text-brand-500 mb-2" />
            <div className="font-semibold">Address</div>
            <div className="text-sm text-gray-600">Vadodara, Gujarat, India</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Send a message</h2>
          <ContactForm />
        </CardContent>
      </Card>
    </section>
  );
}

function ContactForm() {
  return (
    <form action="/api/contact" method="POST" className="grid gap-3">
      <input name="name" required placeholder="Your name" className="h-10 px-3 border rounded-md" />
      <input name="email" type="email" required placeholder="Your email" className="h-10 px-3 border rounded-md" />
      <input name="phone" placeholder="Phone (optional)" className="h-10 px-3 border rounded-md" />
      <textarea name="message" required placeholder="Your message" rows={5} className="px-3 py-2 border rounded-md" />
      <button className="h-10 rounded-md bg-navy-800 text-white font-medium hover:bg-navy-700" type="submit">
        Send
      </button>
    </form>
  );
}
