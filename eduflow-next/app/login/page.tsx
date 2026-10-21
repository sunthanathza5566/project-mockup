'use client';

import { Suspense } from 'react';
import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout>
      {/* useSearchParams (?reason=) ต้องอยู่ใน Suspense สำหรับ static build */}
      <Suspense fallback={null}><LoginForm /></Suspense>
    </AuthLayout>
  );
}
