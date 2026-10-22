'use client';

/**
 * โครงหน้าแอป (ADR-UI-001 pages.md P3/P4, components.md C6)
 * skip link → sidebar (ถาวร ≥1024 / drawer) + top bar + <main id="main">
 * guard เดิม: ไม่ล็อกอิน → /login (ยกเว้นกำลังออกจากระบบ — AuthContext พาไปเอง)
 * init → AppLoader mode="init" · กรรมการ → readonly-banner · session หายแต่บันทึกไม่ได้ → แถบ session-lost (6.4)
 * U-1: กิจกรรมทั้งแอป (กด/พิมพ์/เปลี่ยนหน้า) = touchSession() (throttle 60 วิ ใน API) — ไม่ใช่แค่ใน SAR editor
 * U-2: ระหว่าง session-lost ซ่อนเมนู/แถบบน · เปลี่ยนหน้า หรือกดปุ่ม/ลิงก์ใด ๆ ในหน้า = ถามก่อนแล้ว endSession() ไป /login
 *      (กล่องข้อความยังเลือก/คัดลอกได้ ปุ่ม "คัดลอกข้อความ" ในแถบใช้ได้)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { touchSession } from '@/lib/api';
import { Brand } from '@/components/ui/BrandMark';
import { useToast } from '@/context/ToastContext';
import { isAssessorOnly } from '@/lib/ui/aunqa';
import AppLoader from '@/components/ui/AppLoader';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import { InlineMessage } from './common';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout, exiting, sessionLost, endSession } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isLoading && !user && !exiting) router.push('/login');
  }, [user, isLoading, exiting, router]);

  // ปิด drawer เมื่อเปลี่ยนหน้า
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // U-1: การใช้งานทั้งแอปนับเป็นกิจกรรม (ไม่ต้องให้ทุกฟอร์มเรียกเอง)
  const lost = !!sessionLost;
  useEffect(() => {
    if (!user || lost) return;
    const onActivity = () => touchSession();
    const evs = ['pointerdown', 'keydown', 'input'] as const;
    evs.forEach(e => document.addEventListener(e, onActivity, { capture: true, passive: true }));
    return () => evs.forEach(e => document.removeEventListener(e, onActivity, { capture: true }));
  }, [user, lost]);
  useEffect(() => { if (user && !lost) touchSession(); }, [pathname, user, lost]);

  // U-2: session-lost แล้วเปลี่ยนหน้า (เช่นกด Back) → ออกจริง
  const lostPath = useRef<string | null>(null);
  useEffect(() => {
    if (!lost) { lostPath.current = null; return; }
    if (lostPath.current === null) { lostPath.current = pathname; return; }
    if (pathname !== lostPath.current) endSession();
  }, [lost, pathname, endSession]);

  // U-2: กดปุ่ม/ลิงก์/ตัวเลือกในเนื้อหา ระหว่าง session-lost → ถามก่อนออก (ไม่ทำ action นั้น)
  const askingRef = useRef(false);
  function onLostClickCapture(e: React.MouseEvent<HTMLElement>) {
    if (!lost) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-session-lost-ok], textarea')) return;
    const ctl = t.closest('button, a, select, input, [role="button"], [role="tab"], summary, label');
    if (!ctl) return;
    e.preventDefault();
    e.stopPropagation();
    askLeave();
  }

  // U2-2: คีย์บอร์ดก็ต้องเปลี่ยนค่า/กดปุ่มไม่ได้ (เช่นลูกศรบน select ที่โฟกัสค้าง) — Tab/Esc/Ctrl+C ยังใช้ได้
  function onLostKeyCapture(e: React.KeyboardEvent<HTMLElement>) {
    if (!lost) return;
    const t = e.target as HTMLElement;
    if (t.closest('[data-session-lost-ok], textarea')) return;
    if (['Tab', 'Shift', 'Escape'].includes(e.key) || e.ctrlKey || e.metaKey) return;
    const ctl = t.closest('button, a, select, input, [role="button"], [role="tab"], [role="combobox"], summary, [contenteditable="true"]');
    if (!ctl) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Enter' || e.key === ' ') askLeave();
  }

  function askLeave() {
    if (askingRef.current) return;
    askingRef.current = true;
    confirm({
      title: 'ออกจากระบบแล้ว',
      message: 'ทำรายการนี้ไม่ได้เพราะออกจากระบบแล้ว ถ้าไปหน้าเข้าสู่ระบบ ข้อความที่ยังไม่บันทึกในหน้านี้จะหายไป',
      variant: 'warning',
      cancelText: 'กลับไปคัดลอกข้อความ',
      confirmText: 'ยืนยันไปหน้าเข้าสู่ระบบ',
    }).then(go => { askingRef.current = false; if (go) endSession(); });
  }

  const closeMenu = useCallback(() => {
    setMenuOpen(o => {
      if (o) setTimeout(() => menuBtn.current?.focus(), 0);
      return false;
    });
  }, []);

  if (isLoading) return <AppLoader mode="init" />;
  if (!user) return null;

  const assessor = isAssessorOnly(user);

  // U-2: ระหว่าง session-lost — ไม่มีเมนู/แถบบน (ไม่มีทางไปทำงานต่อในชื่อผู้ใช้เดิม)
  // โครง DOM เดิมทุกชั้น (children อยู่ตำแหน่งเดิม) → หน้าไม่ถูก remount ข้อความที่พิมพ์ค้างยังอยู่ให้คัดลอก
  const lostBanners = sessionLost ? sessionLost.map(f => (
    <InlineMessage
      key={f.label} tone="danger" testId="session-lost" className="aq-session-lost"
      actions={<span data-session-lost-ok className="aq-cluster">
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
        <button type="button" className="aq-btn aq-btn-primary" onClick={endSession} data-testid="session-lost-login">เข้าสู่ระบบใหม่</button>
      </span>}
    >
      {`ออกจากระบบแล้ว แต่${f.label} ยังบันทึกไม่ได้: ${f.error ?? ''} — คัดลอกข้อความเก็บไว้ก่อน แล้วเข้าสู่ระบบใหม่`}
    </InlineMessage>
  )) : null;

  return (
    <div className={lost ? 'aq-shell aq-shell--lost' : 'aq-shell'} data-testid={lost ? 'shell-lost' : undefined}>
      <a href="#main" className="aq-skip">ข้ามไปเนื้อหาหลัก</a>
      {!lost && <AppSidebar user={user} pathname={pathname} open={menuOpen} onClose={closeMenu} onLogout={logout} />}
      <div className="aq-shell__body">
        {lost
          ? <header className="aq-topbar"><Brand /></header>
          : <AppTopbar ref={menuBtn} user={user} pathname={pathname} menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />}
        <main id="main" tabIndex={-1} className="aq-main" onClickCapture={lost ? onLostClickCapture : undefined} onKeyDownCapture={lost ? onLostKeyCapture : undefined}>
          {lostBanners}
          {assessor && !lost && (
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
