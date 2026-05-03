import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about the Lions Club of Baroda Rising Star, our mission, leadership, and history.',
};

export default function AboutPage() {
  return (
    <article className="container-page py-16 max-w-3xl">
      <h1 className="text-4xl font-bold text-navy-800 mb-6">About Us</h1>

      <p className="text-lg text-gray-700 leading-relaxed mb-6">
        The <strong>Lions Club of Baroda Rising Star</strong> is part of
        Lions Clubs International — the world&apos;s largest service
        organisation, with 1.4 million members across 200+ countries.
        Chartered under <strong>District 323-E</strong>, our chapter
        serves the city of Vadodara, Gujarat.
      </p>

      <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">Our Mission</h2>
      <p className="text-gray-700 leading-relaxed">
        To empower volunteers to serve their communities, meet humanitarian
        needs, encourage peace, and promote international understanding
        through Lions clubs.
      </p>

      <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">Focus Areas</h2>
      <ul className="list-disc pl-6 space-y-2 text-gray-700">
        <li>Vision &amp; eye-care camps</li>
        <li>Hunger relief and food distribution</li>
        <li>Pediatric cancer awareness and support</li>
        <li>Diabetes screening and prevention</li>
        <li>Environmental sustainability</li>
        <li>Youth empowerment and scholarships</li>
        <li>Disaster response</li>
      </ul>

      <h2 className="text-2xl font-semibold text-navy-800 mt-10 mb-3">Leadership</h2>
      <p className="text-gray-700">
        Our governing board is elected each Lionistic year and reports
        through District 323-E to Lions Clubs International, Oak Brook, USA.
      </p>
    </article>
  );
}
