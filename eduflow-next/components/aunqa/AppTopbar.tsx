'use client';

/**
 * Top bar (ADR-UI-001 components.md C6 + C16, pages.md P4 · TASK-0002 saas-spec §P4)
 * [ปุ่มเมนู (<1024)] [แบรนด์ (<1024)] … [LangToggle (≥768)] [สลับธีม] [กระดิ่ง] [ผู้ใช้]
 * - ไม่มี h1 · เงา shadow-sm เมื่อ scroll > 0 · พื้นโปร่ง bg-background/80 + backdrop-blur
 * - กระดิ่ง: Link /app#notifications · aria-label "แจ้งเตือนที่ยังไม่อ่าน N รายการ" (E2E-08) · จุดนับ animate-bump ครั้งเดียวเมื่อเพิ่ม (L13)
 * - ชื่อผู้ใช้ testid nav-user: มองเห็นที่ ≥768, ต่ำกว่านั้นเป็น sr-only
 * - แบรนด์ <480 แสดงเฉพาะโลโก้ (wordmark + ปุ่มสลับธีมเกินความกว้าง 390)
 * - ปุ่มสลับธีม `theme-toggle` (ThemeToggleButton จาก S0) — มีตัวเดียวในหน้า
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AppUser } from '@/lib/types';
import { unreadCount } from '@/lib/api';
import { initials, primaryRoleTh } from '@/lib/ui/aunqa';
import { TODOS_CHANGED_EVENT, countLabel } from '@/lib/ui/todo';
import { cn } from '@/lib/ui/cn';
import Icon from '@/components/ui/Icon';
import BrandMark, { Brand } from '@/components/ui/BrandMark';
import LangToggle from '@/components/ui/LangToggle';
import { ThemeToggleButton } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/primitives/button';

/** ปุ่ม ghost ช่วงเปลี่ยนผ่าน: กันพื้น/ขอบของกฎ .aq-btn ใน legacy.css (ลบได้หลัง S6) */
const GHOST_FIX = 'border-transparent bg-transparent';

const AppTopbar = forwardRef<HTMLButtonElement, {
  user: AppUser; pathname: string; menuOpen: boolean; onMenu: () => void;
}>(function AppTopbar({ user, pathname, menuOpen, onMenu }, menuRef) {
  const [scrolled, setScrolled] = useState(false);
  const [unread, setUnread] = useState(0);
  const [bump, setBump] = useState(false);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 0);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // หน้าที่เปลี่ยนสถานะงาน/อ่านแจ้งเตือน dispatch aunqa:todos-changed → นับใหม่ทันที
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick(t => t + 1);
    window.addEventListener(TODOS_CHANGED_EVENT, on);
    return () => window.removeEventListener(TODOS_CHANGED_EVENT, on);
  }, []);

  useEffect(() => {
    const n = unreadCount(user);
    setUnread(n);
    if (prev.current !== null && n > prev.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      prev.current = n;
      return () => clearTimeout(t);
    }
    prev.current = n;
  }, [user, pathname, tick]);

  const n = countLabel(unread);
  return (
    <header
      className={cn(
        'sticky top-0 z-topbar flex min-h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur transition-shadow duration-fast ease-hover md:px-6',
        scrolled && 'shadow-sm dark:shadow-none',
      )}
    >
      <Button
        ref={menuRef} variant="ghost" size="icon" className={cn(GHOST_FIX, 'lg:hidden')}
        aria-label="เปิดเมนู" aria-expanded={menuOpen} aria-controls="app-sidebar" data-testid="nav-menu" onClick={onMenu}
      >
        <Icon name="menu" size={20} />
      </Button>
      <Link href="/app" className="inline-flex min-w-0 shrink items-center no-underline lg:hidden" aria-label="AUN-QA Copilot หน้าหลัก">
        <span className="inline-flex sm:hidden"><BrandMark size={32} /></span>
        <span className="hidden min-w-0 sm:inline-flex"><Brand size={20} /></span>
      </Link>
      <span className="flex-1" />
      <LangToggle className="hidden md:inline-flex" />
      <ThemeToggleButton className={GHOST_FIX} />
      <Link
        href="/app#notifications" data-testid="nav-bell" aria-label={`แจ้งเตือนที่ยังไม่อ่าน ${unread} รายการ`}
        className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-foreground no-underline transition-colors duration-fast ease-hover visited:text-foreground hover:bg-accent hover:text-foreground"
      >
        <Icon name="bell" size={20} />
        {n && <span className={cn('aq-count absolute right-0.5 top-0.5', bump && 'animate-bump')} aria-hidden="true">{n}</span>}
      </Link>
      <span className="flex min-w-0 items-center gap-2 pl-1">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-muted text-base font-medium text-primary"
          aria-hidden="true"
        >
          {initials(user.fullName)}
        </span>
        <span className="sr-only md:not-sr-only md:flex md:min-w-0 md:flex-col">
          <span className="block max-w-[13.75rem] truncate py-0.5 font-medium text-foreground" data-testid="nav-user">{user.fullName}</span>
          <span className="aq-meta block">{primaryRoleTh(user)}</span>
        </span>
      </span>
    </header>
  );
});

export default AppTopbar;
