import { BeneficiaryForm } from '@/app/admin/beneficiaries/BeneficiaryForm';

export const dynamic = 'force-dynamic';

export default function MobileNewBeneficiary() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-800">Add Beneficiary</h1>
      <p className="text-sm text-gray-600">
        Create a quick beneficiary profile. You can log services from the profile later.
      </p>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <BeneficiaryForm mode="create" />
      </div>
    </div>
  );
}
