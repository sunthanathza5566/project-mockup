'use client';

/**
 * เมนูหลักจัดกลุ่ม (ADR-UI-001 components.md C6, pages.md P4)
 * - ≥1024 sidebar ถาวร · <1024 drawer ซ้าย (DOM เดียวกัน เปลี่ยนโหมดด้วย CSS + state → testid ไม่ซ้ำ)
 * - drawer: focus trap, Esc ปิด, คลิก overlay ปิด, ปิดเองเมื่อเปลี่ยนหน้า, คืน focus ไปปุ่มเมนู (AppShell จัดการ)
 * - badge "รอท่าน" = todoTotal (หน้าหลัก) / reviewTotal (รอตรวจ) — คำนวณใหม่เมื่อเปลี่ยนหน้าและเมื่อมี `aunqa:todos-changed`
 * - เงื่อนไขแสดงเมนูคงเดิมทุกข้อ · testid nav-* เดิม
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import type { AppUser } from '@/lib/types';
import { listMyTodos } from '@/lib/api';
import { canAny, isAssessorOnly } from '@/lib/ui/aunqa';
import { TODOS_CHANGED_EVENT, countLabel, reviewTotal, todoTotal } from '@/lib/ui/todo';
import Icon, { type IconName } from '@/components/ui/Icon';
import { Brand } from '@/components/ui/BrandMark';
import Term from '@/components/ui/Term';
import { DisplayPrefsButton } from '@/components/ui/DisplayPrefs';

interface MenuItem { path: string; label: string; testId: string; icon: IconName; show: boolean; badge?: number }
interface MenuGroup { key: string; title: React.ReactNode; items: MenuItem[] }

export default function AppSidebar({ user, pathname, open, onClose, onLogout }: {
  user: AppUser; pathname: string; open: boolean; onClose: () => void; onLogout: () => void;
}) {
  const [counts, setCounts] = useState({ home: 0, review: 0 });
  const ref = useRef<HTMLElement>(null);

  // badge รอท่าน
  useEffect(() => {
    const calc = () => {
      try {
        const items = listMyTodos(user);
        setCounts({ home: todoTotal(items), review: reviewTotal(items) });
      } catch { setCounts({ home: 0, review: 0 }); }
    };
    calc();
    window.addEventListener(TODOS_CHANGED_EVENT, calc);
    return () => window.removeEventListener(TODOS_CHANGED_EVENT, calc);
  }, [user, pathname]);

  // drawer: focus รายการแรกเมื่อเปิด
  useEffect(() => {
    if (!open) return;
    const first = ref.current?.querySelector<HTMLElement>('a, button');
    first?.focus();
  }, [open]);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'))
      .filter(n => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const assessor = isAssessorOnly(user);
  const canReview = canAny(user, 'sar.approve') || canAny(user, 'sar.return')
    || canAny(user, 'approve.faculty') || canAny(user, 'approve.final');
  const groups: MenuGroup[] = [
    { key: 'mine', title: 'งานของฉัน', items: [
      { path: '/app', label: 'หน้าหลัก', testId: 'nav-home', icon: 'home', show: true, badge: counts.home },
      { path: '/app/review', label: 'รอตรวจ', testId: 'nav-review', icon: 'inbox-check', show: canReview, badge: counts.review },
    ] },
    { key: 'sar', title: <Term k="sar" label="SAR">จัดทำรายงาน (SAR)</Term>, items: [
      { path: '/app/cycles', label: 'รอบประเมิน', testId: 'nav-cycles', icon: 'calendar-cycle', show: true },
      { path: '/app/evidence', label: 'หลักฐาน', testId: 'nav-evidence', icon: 'folder', show: true },
      { path: '/app/export', label: 'ส่งออกเอกสาร', testId: 'nav-export', icon: 'download', show: true },
    ] },
    { key: 'prog', title: 'ข้อมูลหลักสูตร', items: [
      { path: '/app/curriculum', label: 'หลักสูตร (PLO/รายวิชา)', testId: 'nav-curriculum', icon: 'book-open', show: !assessor },
      { path: '/app/metrics', label: 'ตัวชี้วัด', testId: 'nav-metrics', icon: 'chart-line', show: !assessor },
      { path: '/app/actions', label: 'แผนปรับปรุง', testId: 'nav-actions', icon: 'list-check', show: !assessor },
    ] },
    { key: 'ref', title: 'อ้างอิง', items: [
      { path: '/app/requirements', label: 'คลังเกณฑ์ AUN-QA', testId: 'nav-requirements', icon: 'library', show: true },
    ] },
    { key: 'admin', title: 'ผู้ดูแล', items: [
      { path: '/app/admin', label: 'ผู้ดูแลระบบ', testId: 'nav-admin', icon: 'shield-user', show: canAny(user, 'user.manage') || canAny(user, 'audit.view') },
    ] },
  ];

  return (
    <>
      {open && <div className="aq-drawer-overlay" onClick={onClose} aria-hidden="true" />}
      <aside
        ref={ref} id="app-sidebar" className={`aq-sidebar${open ? ' is-open' : ''}`}
        aria-label="เมนูหลัก" onKeyDown={onKeyDown}
      >
        <div className="aq-sidebar__brand">
          <Link href="/app" aria-label="AUN-QA Copilot หน้าหลัก"><Brand size={20} /></Link>
          <button type="button" className="aq-btn aq-btn-ghost aq-btn-icon aq-sidebar__close" aria-label="ปิดเมนู" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <nav className="aq-sidebar__nav" aria-label="เมนูหลัก">
          {groups.map(g => {
            const items = g.items.filter(i => i.show);
            if (!items.length) return null;
            return (
              <div key={g.key}>
                <p className="aq-nav-group" id={`navg-${g.key}`}>{g.title}</p>
                <ul className="aq-nav-list" aria-labelledby={`navg-${g.key}`}>
                  {items.map(m => {
                    const active = m.path === '/app' ? pathname === '/app' : pathname.startsWith(m.path);
                    const badge = countLabel(m.badge ?? 0);
                    return (
                      <li key={m.path}>
                        <Link
                          href={m.path} data-testid={m.testId} className="aq-nav-item"
                          aria-current={active ? 'page' : undefined}
                          aria-label={badge ? `${m.label} — มีงานรอท่าน ${m.badge} งาน` : undefined}
                          onClick={onClose}
                        >
                          <Icon name={m.icon} size={20} />
                          <span className="aq-nav-item__label">{m.label}</span>
                          {badge && <span className="aq-count" aria-hidden="true">{badge}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="aq-sidebar__foot">
          <DisplayPrefsButton />
          <button type="button" className="aq-btn aq-btn-ghost" data-testid="logout" onClick={onLogout}>
            <Icon name="log-out" size={20} />ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  );
}
