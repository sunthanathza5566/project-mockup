'use client';

/**
 * Top bar (ADR-UI-003 D3 / friendly-spec §F1, §F2 — แทน saas-spec §P4)
 * [ปุ่ม เมนู (<1024)] [โลโก้ (<1024 และ ≥480)] … [LangSwitch] [แจ้งเตือน] [เมนูผู้ใช้]
 * - ทุก control บน desktop มีข้อความที่มองเห็น · มือถือยกเว้นกระดิ่ง/avatar (มี aria-label / ชื่อ sr-only)
 * - ไม่มี h1 · สูง h-topbar (64) · เงา shadow-sm เมื่อ scroll > 0
 * - พื้น bg-card/90 + backdrop-blur อยู่บนชั้นลูก (absolute -z-10) ไม่ใช่บน <header>: backdrop-filter บน header
 *   ทำให้ panel แจ้งเตือนแบบ fixed (sheet มือถือ) อิง header แทน viewport
 * - ปุ่มสลับธีมเดี่ยว (`theme-toggle`) เลิกใช้ — ธีม/ขนาดตัวอักษร/ออกจากระบบ อยู่ในเมนูผู้ใช้
 * - 390px: เมนู + ภาษา (ไทย│EN) + กระดิ่ง + avatar ≈ 320px (125% ≈ 385px) — ระยะห่าง/ขอบลดลงที่ <480
 */
import { forwardRef, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AppUser } from '@/lib/types';
import { cn } from '@/lib/ui/cn';
import Icon from '@/components/ui/Icon';
import BrandMark from '@/components/ui/BrandMark';
import LangToggle from '@/components/ui/LangToggle';
import { Button } from '@/components/ui/primitives/button';
import { NotificationBell } from './NotificationPanel';
import UserMenu from './UserMenu';

const AppTopbar = forwardRef<HTMLButtonElement, {
  user: AppUser; menuOpen: boolean; onMenu: () => void; onLogout: () => void;
}>(function AppTopbar({ user, menuOpen, onMenu, onLogout }, menuRef) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 0);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-topbar flex h-topbar items-center gap-1.5 px-3 transition-shadow duration-fast ease-hover sm:gap-2 sm:px-4 md:gap-3 md:px-6',
        scrolled && 'shadow-sm dark:shadow-none',
      )}
    >
      <div className="absolute inset-0 -z-10 border-b bg-card/90 backdrop-blur" aria-hidden="true" />
      <Button
        ref={menuRef} variant="ghost" className="shrink-0 gap-1.5 px-2 sm:px-3 lg:hidden"
        aria-expanded={menuOpen} aria-controls="app-sidebar" data-testid="nav-menu" onClick={onMenu}
      >
        <Icon name="menu" size={20} />เมนู
      </Button>
      <Link
        href="/app" aria-label="AUN-QA Copilot หน้าหลัก"
        className="hidden shrink-0 items-center rounded-md no-underline sm:inline-flex lg:hidden"
      >
        <BrandMark size={32} />
      </Link>
      <span className="min-w-0 flex-1" />
      <LangToggle />
      <NotificationBell user={user} />
      <UserMenu user={user} onLogout={onLogout} />
    </header>
  );
});

export default AppTopbar;
