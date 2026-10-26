'use client';

/**
 * เมนูหลักจัดกลุ่ม (ADR-UI-003 D3 / friendly-spec §F1 — แทน saas-spec §P4)
 * - ≥1024 sidebar ถาวร bg-card · <1024 drawer ซ้าย (DOM เดียวกัน เปลี่ยนโหมดด้วย CSS + state → testid ไม่ซ้ำ)
 * - 4 กลุ่ม: งานของฉัน · จัดทำรายงาน SAR · ข้อมูลหลักสูตร (รวม "คลังเกณฑ์" เดิมของกลุ่มอ้างอิง) · ผู้ดูแล — กลุ่มว่างไม่แสดงหัว
 *   เงื่อนไขแสดงเมนูต่อ role เดิมทุกข้อ · testid nav-* เดิม
 * - drawer: focus trap, Esc ปิด, คลิก overlay ปิด, ปิดเองเมื่อเปลี่ยนหน้า, คืน focus ไปปุ่มเมนู (AppShell) · หัว drawer มีปุ่ม "ปิด" (`nav-drawer-close`)
 * - ตัวนับ: หน้าหลัก = homeTotal (todoTotal + คำขอรออนุมัติของผู้มี user.manage — V1 m2) ·รอตรวจ = reviewTotal · ผู้ดูแลระบบ = คำขอเข้าใช้งานรออนุมัติ (countPendingAccessRequests)
 *   คำนวณใหม่เมื่อเปลี่ยนหน้าและเมื่อมี `aunqa:todos-changed`
 * - ไม่มีส่วนล่าง (การแสดงผล/ออกจากระบบ ย้ายไปเมนูผู้ใช้ — §F11)
 * hook ที่คงไว้: `#app-sidebar` + class `is-open` + `data-open` (สไตล์ drawer อ่านจาก data-open), `a.aq-nav-item`, `.aq-nav-group`, `.aq-count`
 * ช่วงเปลี่ยนผ่าน (legacy.css ยังโหลด): active ใช้ variant `aria-[current=page]:` · สีไอคอนใช้ `!` (ลบได้หลัง S6)
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import type { AppUser } from '@/lib/types';
import { countPendingAccessRequests, listMyTodos } from '@/lib/api';
import { canAny, isAssessorOnly } from '@/lib/ui/aunqa';
import { TODOS_CHANGED_EVENT, countLabel, homeTotal, reviewTotal } from '@/lib/ui/todo';
import Icon, { type IconName } from '@/components/ui/Icon';
import { Brand } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/primitives/button';

/** drawer <1024 (ซ่อนนอกจอ + invisible จนมี data-open; class is-open คงไว้เป็น hook เทสต์) · ≥1024 sticky เต็มความสูง */
const SIDEBAR =
  'fixed inset-y-0 left-0 z-drawer flex w-[min(20rem,86vw)] flex-col border-r bg-card shadow-lg ' +
  '-translate-x-full invisible transition-[transform,visibility] duration-fast ease-exit ' +
  'data-[open]:visible data-[open]:translate-x-0 data-[open]:duration-base data-[open]:ease-enter ' +
  'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:visible lg:translate-x-0 lg:shadow-none lg:transition-none';

/**
 * รายการเมนู (hook aq-nav-item — target audit 44px) · active = พื้น primary-muted + ตัวหนา (คู่ #12) ไม่มีแถบซ้ายแล้ว
 * `before:!hidden` ปิดแถบ ::before สีน้ำเงินของ legacy.css (`.aq-nav-item[aria-current=page]::before` — V1 m1) ลบได้หลัง S6
 */
const NAV_ITEM =
  'aq-nav-item group flex min-h-11 items-center gap-3 rounded-lg px-3 text-base text-foreground no-underline before:!hidden ' +
  'transition-colors duration-fast ease-hover visited:text-foreground hover:bg-accent hover:text-foreground ' +
  'aria-[current=page]:bg-primary-muted aria-[current=page]:font-semibold aria-[current=page]:text-foreground';

/** ไอคอนเมนู: เทา · active = primary (คู่ #11) */
const NAV_ICON = '!text-muted-foreground group-aria-[current=page]:!text-primary';

interface MenuItem { path: string; label: string; testId: string; icon: IconName; show: boolean; badge?: number }
interface MenuGroup { key: string; title: string; items: MenuItem[] }

export default function AppSidebar({ user, pathname, open, onClose }: {
  user: AppUser; pathname: string; open: boolean; onClose: () => void;
}) {
  const [counts, setCounts] = useState({ home: 0, review: 0, requests: 0 });
  const ref = useRef<HTMLElement>(null);

  // ตัวนับ: งานรอท่าน + คำขอเข้าใช้งานรออนุมัติ
  useEffect(() => {
    const calc = () => {
      let home = 0, review = 0, requests = 0;
      try { requests = canAny(user, 'user.manage') ? countPendingAccessRequests(user) : 0; } catch { requests = 0; }
      try {
        const items = listMyTodos(user);
        home = homeTotal(items, requests); // รวมงาน "อนุมัติคำขอเข้าใช้งาน" บนหน้าหลัก (V1 m2) — ตรงกับ "(รวม N งาน)"
        review = reviewTotal(items);
      } catch { /* นับไม่ได้ = ไม่แสดงตัวนับ */ }
      setCounts({ home, review, requests });
    };
    calc();
    window.addEventListener(TODOS_CHANGED_EVENT, calc);
    return () => window.removeEventListener(TODOS_CHANGED_EVENT, calc);
  }, [user, pathname]);

  // drawer: focus รายการแรกเมื่อเปิด (ปุ่ม "ปิด" อยู่หลังลิงก์แบรนด์)
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
    { key: 'sar', title: 'จัดทำรายงาน SAR', items: [
      { path: '/app/cycles', label: 'รอบประเมิน', testId: 'nav-cycles', icon: 'calendar-cycle', show: true },
      { path: '/app/evidence', label: 'หลักฐาน', testId: 'nav-evidence', icon: 'folder', show: true },
      { path: '/app/export', label: 'ส่งออกเอกสาร', testId: 'nav-export', icon: 'download', show: true },
    ] },
    { key: 'prog', title: 'ข้อมูลหลักสูตร', items: [
      { path: '/app/curriculum', label: 'หลักสูตร (PLO/รายวิชา)', testId: 'nav-curriculum', icon: 'book-open', show: !assessor },
      { path: '/app/metrics', label: 'ตัวชี้วัด', testId: 'nav-metrics', icon: 'chart-line', show: !assessor },
      { path: '/app/actions', label: 'แผนปรับปรุง', testId: 'nav-actions', icon: 'list-check', show: !assessor },
      { path: '/app/requirements', label: 'คลังเกณฑ์ AUN-QA', testId: 'nav-requirements', icon: 'library', show: true },
    ] },
    { key: 'admin', title: 'ผู้ดูแล', items: [
      {
        path: '/app/admin', label: 'ผู้ดูแลระบบ', testId: 'nav-admin', icon: 'shield-user',
        show: canAny(user, 'user.manage') || canAny(user, 'audit.view'), badge: counts.requests,
      },
    ] },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-drawer animate-fade-in bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        ref={ref} id="app-sidebar" className={`${SIDEBAR}${open ? ' is-open' : ''}`} data-open={open || undefined}
        aria-label="เมนูหลัก" onKeyDown={onKeyDown}
      >
        <div className="flex h-topbar shrink-0 items-center justify-between gap-2 px-4 lg:px-5">
          <Link href="/app" aria-label="AUN-QA Copilot หน้าหลัก" className="inline-flex min-w-0 overflow-hidden rounded-md no-underline">
            <Brand size={20} />
          </Link>
          <Button
            variant="ghost" className="shrink-0 gap-1.5 px-3 lg:hidden"
            onClick={onClose} data-testid="nav-drawer-close"
          >
            <Icon name="x" size={20} />ปิด
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="เมนูหลัก">
          {groups.map(g => {
            const items = g.items.filter(i => i.show);
            if (!items.length) return null;
            return (
              <div key={g.key} className="mt-6 first:mt-2">
                {/* !mt-0: กฎเดิม .aq-nav-group:first-child (legacy.css) — ระยะห่างอยู่ที่ div แทน */}
                <p className="aq-nav-group !mt-0 px-3 pb-1.5" id={`navg-${g.key}`}>{g.title}</p>
                <ul className="m-0 grid list-none gap-0.5 p-0" aria-labelledby={`navg-${g.key}`}>
                  {items.map(m => {
                    const active = m.path === '/app' ? pathname === '/app' : pathname.startsWith(m.path);
                    const badge = countLabel(m.badge ?? 0);
                    return (
                      <li key={m.path}>
                        <Link
                          href={m.path} data-testid={m.testId} className={NAV_ITEM}
                          aria-current={active ? 'page' : undefined}
                          aria-label={badge ? `${m.label} — มีงานรอท่าน ${m.badge} งาน` : undefined}
                          onClick={onClose}
                        >
                          <Icon name={m.icon} size={20} className={NAV_ICON} />
                          <span className="min-w-0 flex-1">{m.label}</span>
                          {badge && <span className="aq-count ml-auto" aria-hidden="true">{badge}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
