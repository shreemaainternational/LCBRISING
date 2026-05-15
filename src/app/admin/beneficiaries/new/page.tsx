import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BeneficiaryForm } from '../BeneficiaryForm';

export const dynamic = 'force-dynamic';

export default function NewBeneficiaryPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/beneficiaries" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-800">
        <ArrowLeft size={14} /> Back
      </Link>
      <div>
        <h1 className="text-3xl font-bold text-navy-800 mb-1">Add Beneficiary</h1>
        <p className="text-gray-600">
          Create a beneficiary profile. You can log services and follow-ups from the
          profile page once saved.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <BeneficiaryForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
