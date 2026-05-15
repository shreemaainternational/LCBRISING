import { LogActivityForm } from './LogActivityForm';

export const dynamic = 'force-dynamic';

export default function MobileNewActivity() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-800">Log Activity</h1>
      <p className="text-sm text-gray-600">
        Capture a service project quickly — title, date, beneficiaries, hours. You can
        edit photos and details later from the desktop CRM.
      </p>
      <LogActivityForm />
    </div>
  );
}
