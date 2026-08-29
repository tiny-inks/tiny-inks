import { Suspense } from 'react';
import StaffLogin from '@/components/staff/StaffLogin';

export const metadata = { title: 'Staff sign-in · Tiny Inks' };

export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLogin />
    </Suspense>
  );
}
