'use client';

/**
 * แท็บข้อมูลเดโม่ (friendly-spec §F8.3 · ADR-AUTH-001 A8.3) — หน้าแสดงแท็บนี้เฉพาะ super_admin
 * (`resetDemo` ของ non-super = forbidden อยู่แล้ว) · logic/testid `reset-demo` เดิม
 */
import { useRouter } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { resetDemo } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { AsyncButton } from '@/components/aunqa/common';
import Icon from '@/components/ui/Icon';
import { errMsg } from '@/lib/ui/aunqa';
import { CARD } from './shared';

export default function DemoTab({ user }: { user: AppUser }) {
  const { confirm, notify } = useDialog();
  const { refresh } = useAuth();
  const router = useRouter();
  return (
    <section className={`${CARD} max-w-2xl`} aria-labelledby="demo-h">
      <h2 id="demo-h" className="text-lg font-semibold text-foreground">รีเซ็ตข้อมูลเดโม่</h2>
      <p className="mt-2 text-base text-muted-foreground">ล้างข้อมูลทั้งหมดของระบบนี้ (รอบ หลักฐาน SAR audit log) และสร้างข้อมูลสมมติใหม่ — ต้องเข้าสู่ระบบใหม่</p>
      <p className="mt-2 text-base font-medium text-foreground">ล้างข้อมูลทุกมหาวิทยาลัยในเบราว์เซอร์นี้</p>
      <div className="mt-5">
        <AsyncButton variant="destructive" testId="reset-demo" busyText="กำลังรีเซ็ต…" onClick={async () => {
          const ok = await confirm({
            title: 'รีเซ็ตข้อมูลเดโม่?', message: 'ข้อมูลที่แก้ไขทั้งหมดจะหาย และย้อนกลับไม่ได้', variant: 'danger',
            confirmText: 'ยืนยันล้างและสร้างข้อมูลเดโม่ใหม่',
          });
          if (!ok) return;
          try {
            await resetDemo(user);
            await notify({ title: 'รีเซ็ตเรียบร้อย', message: 'กรุณาเข้าสู่ระบบใหม่' });
            refresh();
            router.push('/login');
          } catch (e) { await notify({ title: 'รีเซ็ตไม่สำเร็จ', message: errMsg(e), variant: 'danger' }); }
        }}><Icon name="trash" size={20} />รีเซ็ตข้อมูลเดโม่</AsyncButton>
      </div>
    </section>
  );
}
