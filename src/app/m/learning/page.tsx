import { GraduationCap, PlayCircle, Award, BookOpen, ExternalLink } from 'lucide-react';
import { Card, CardHeading, RowCard } from '../_ui';

export const dynamic = 'force-dynamic';

const COURSES = [
  { icon: BookOpen, title: 'New Member Orientation', desc: 'What it means to be a Lion — history, motto and structure.' },
  { icon: PlayCircle, title: 'Club Officer Essentials', desc: 'Roles of president, secretary and treasurer.' },
  { icon: Award, title: 'Service Project Planning', desc: 'Plan, run and report impactful service activities.' },
];

export default function LearningCenter() {
  return (
    <>
      <Card className="overflow-hidden">
        <div className="bg-[#1e40af] text-white p-4 flex items-center gap-3">
          <GraduationCap size={28} />
          <div>
            <div className="text-lg font-extrabold leading-tight">District Learning Center</div>
            <div className="text-xs text-blue-100/90">Learn, grow and earn certificates</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <CardHeading>Curated Courses</CardHeading>
        <div className="mt-3 space-y-2">
          {COURSES.map((c) => (
            <div key={c.title} className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-none">
                <c.icon size={20} className="text-[#1e40af]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900">{c.title}</div>
                <div className="text-xs text-gray-500 leading-snug">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <RowCard
        icon={ExternalLink}
        title="Lions Learning Center"
        desc="Official LCI courses and certifications"
        href="https://www.lionsclubs.org/en/resources-for-members/resource-center/learning-center"
      />

      <p className="text-center text-xs text-gray-400 pt-1">More district courses coming soon.</p>
    </>
  );
}
