'use client';

/** หน้าสาธารณะ: ขอเข้าใช้งาน (friendly-spec §F6 · ADR-AUTH-001 O2) — ไม่ต้องเข้าสู่ระบบ */
import AuthLayout from '@/components/auth/AuthLayout';
import RequestAccessForm from '@/components/auth/RequestAccessForm';

export default function RequestAccessPage() {
  return (
    <AuthLayout>
      <RequestAccessForm />
    </AuthLayout>
  );
}
