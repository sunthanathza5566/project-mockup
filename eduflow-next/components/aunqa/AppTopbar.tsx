'use client';

/**
 * Top bar (ADR-UI-001 components.md C6 + C16, pages.md P4)
 * [ปุ่มเมนู (<1024)] [แบรนด์ (<1024)] … [LangToggle (≥768)] [กระดิ่ง] [ผู้ใช้]
 * - ไม่มี h1 · เงา e-1 เมื่อ scroll > 0
 * - กระดิ่ง: Link /app#notifications · aria-label "แจ้งเตือนที่ยังไม่อ่าน N รายการ" (E2E-08) · จุดนับ scale ครั้งเดียวเมื่อเพิ่ม (L13)
 * - ชื่อผู้ใช้ testid nav-user: มองเห็นที่ ≥768, ต่ำกว่านั้นเป็น sr-only
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AppUser } from '@/lib/types';
import { unreadCount } from '@/lib/api';
import { initials, primaryRoleTh } from '@/lib/ui/aunqa';
import { countLabel } from '@/lib/ui/todo';
import Icon from '@/components/ui/Icon';
import { Brand } from '@/components/ui/BrandMark';
import LangToggle from '@/components/ui/LangToggle';

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
  }, [user, pathname]);

  const n = countLabel(unread);
  return (
    <header className={`aq-topbar${scrolled ? ' is-scrolled' : ''}`}>
      <button
        ref={menuRef} type="button" className="aq-btn aq-btn-ghost aq-btn-icon aq-topbar__menu"
        aria-label="เปิดเมนู" aria-expanded={menuOpen} aria-controls="app-sidebar" data-testid="nav-menu" onClick={onMenu}
      >
        <Icon name="menu" size={20} />
      </button>
      <Link href="/app" className="aq-topbar__brand" aria-label="AUN-QA Copilot หน้าหลัก"><Brand size={20} /></Link>
      <span className="aq-topbar__spacer" />
      <LangToggle className="aq-btn-compact aq-topbar__lang" />
      <Link href="/app#notifications" className="aq-bell" data-testid="nav-bell" aria-label={`แจ้งเตือนที่ยังไม่อ่าน ${unread} รายการ`}>
        <Icon name="bell" size={20} />
        {n && <span className={`aq-count${bump ? ' is-bump' : ''}`} aria-hidden="true">{n}</span>}
      </Link>
      <span className="aq-user">
        <span className="aq-avatar" aria-hidden="true">{initials(user.fullName)}</span>
        <span className="aq-user__text">
          <span className="aq-user__name" data-testid="nav-user">{user.fullName}</span>
          <span className="aq-user__role aq-meta">{primaryRoleTh(user)}</span>
        </span>
      </span>
    </header>
  );
});

export default AppTopbar;
