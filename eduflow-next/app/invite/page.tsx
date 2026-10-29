'use client';

/**
 * หน้าสาธารณะ: รับคำเชิญ (friendly-spec §F7 · ADR-AUTH-001 O1) — ไม่ต้องเข้าสู่ระบบ
 * ลิงก์เชิญเป็น `/invite#t=<token>` — token อยู่ใน fragment จึงไม่ถูกส่งมาที่ server (หน้า static อ่านฝั่ง client เท่านั้น)
 */
import AuthLayout from '@/components/auth/AuthLayout';
import InviteAcceptForm from '@/components/auth/InviteAcceptForm';

export default function InvitePage() {
  return (
    <AuthLayout>
      <InviteAcceptForm />
    </AuthLayout>
  );
}
