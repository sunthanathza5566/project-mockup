'use client';

/**
 * โครงหน้าแอป (ADR-UI-001 pages.md P3/P4, components.md C6)
 * skip link → sidebar (ถาวร ≥1024 / drawer) + top bar + <main id="main">
 * guard เดิม: ไม่ล็อกอิน → /login (ยกเว้นกำลังออกจากระบบ — AuthContext พาไปเอง)
 * init → AppLoader mode="init" · กรรมการ → readonly-banner · session หายแต่บันทึกไม่ได้ → แถบ session-lost (6.4)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { isAssessorOnly } from '@/lib/ui/aunqa';
import AppLoader from '@/components/ui/AppLoader';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import { InlineMessage } from './common';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout, exiting, sessionLost } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isLoading && !user && !exiting) router.push('/login');
  }, [user, isLoading, exiting, router]);

  // ปิด drawer เมื่อเปลี่ยนหน้า
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const closeMenu = useCallback(() => {
    setMenuOpen(o => {
      if (o) setTimeout(() => menuBtn.current?.focus(), 0);
      return false;
    });
  }, []);

  if (isLoading) return <AppLoader mode="init" />;
  if (!user) return null;

  const assessor = isAssessorOnly(user);

  return (
    <div className="aq-shell">
      <a href="#main" className="aq-skip">ข้ามไปเนื้อหาหลัก</a>
      <AppSidebar user={user} pathname={pathname} open={menuOpen} onClose={closeMenu} onLogout={logout} />
      <div className="aq-shell__body">
        <AppTopbar ref={menuBtn} user={user} pathname={pathname} menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />
        <main id="main" tabIndex={-1} className="aq-main">
          {sessionLost && sessionLost.map(f => (
            <InlineMessage
              key={f.label} tone="danger" testId="session-lost" className="aq-session-lost"
              actions={<>
                {f.text !== undefined && (
                  <button
                    type="button" className="aq-btn"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(f.text ?? ''); showToast('คัดลอกข้อความแล้ว', 'success'); }
                      catch { showToast('คัดลอกไม่สำเร็จ — เลือกข้อความแล้วคัดลอกเอง', 'error'); }
                    }}
                  >
                    คัดลอกข้อความ
                  </button>
                )}
                <Link href="/login" className="aq-btn aq-btn-primary">เข้าสู่ระบบใหม่</Link>
              </>}
            >
              {`ออกจากระบบแล้ว แต่${f.label} ยังบันทึกไม่ได้: ${f.error ?? ''} — คัดลอกข้อความเก็บไว้ก่อน แล้วเข้าสู่ระบบใหม่`}
            </InlineMessage>
          ))}
          {assessor && (
            <InlineMessage tone="info" testId="readonly-banner">
              คุณเข้าในฐานะกรรมการประเมิน — เห็นเฉพาะรอบที่ได้รับมอบหมาย (อ่านอย่างเดียว)
            </InlineMessage>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
