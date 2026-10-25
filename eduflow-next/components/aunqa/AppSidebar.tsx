'use client';

/**
 * เมนูหลักจัดกลุ่ม (ADR-UI-001 components.md C6, pages.md P4)
 * - ≥1024 sidebar ถาวร · <1024 drawer ซ้าย (DOM เดียวกัน เปลี่ยนโหมดด้วย CSS + state → testid ไม่ซ้ำ)
 * - drawer: focus trap, Esc ปิด, คลิก overlay ปิด, ปิดเองเมื่อเปลี่ยนหน้า, คืน focus ไปปุ่มเมนู (AppShell จัดการ)
 * - badge "รอท่าน" = todoTotal (หน้าหลัก) / reviewTotal (รอตรวจ) — คำนวณใหม่เมื่อเปลี่ยนหน้าและเมื่อมี `aunqa:todos-changed`
 * - เงื่อนไขแสดงเมนูคงเดิมทุกข้อ · testid nav-* เดิม
 * TASK-0002 S2 (saas-spec §P4): Tailwind — hook ที่คงไว้ `#app-sidebar` + `is-open`, `a.aq-nav-item`, `.aq-nav-group`, `.aq-count`
 *   ช่วงเปลี่ยนผ่าน (มี legacy.css): สถานะ active ใช้ variant `aria-[current=page]:` (specificity เท่ากฎเดิม + มาทีหลัง)
 *   สีไอคอนใช้ `!` เพราะกฎสีไอคอนเมนูใน legacy.css แรงกว่า — ลบ `!` ได้หลัง S6 ลบ legacy.css
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
import { Button } from '@/components/ui/primitives/button';

/** drawer <1024 (ซ่อนนอกจอ + invisible จนมี data-open; class is-open คงไว้เป็น hook เทสต์) · ≥1024 sticky เต็มความสูง (§P4) */
const SIDEBAR =
  'fixed inset-y-0 left-0 z-drawer flex w-[min(20rem,86vw)] flex-col border-r bg-background shadow-lg ' +
  '-translate-x-full invisible transition-[transform,visibility] duration-fast ease-exit ' +
  'data-[open]:visible data-[open]:translate-x-0 data-[open]:duration-base data-[open]:ease-enter ' +
  'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:visible lg:translate-x-0 lg:shadow-none lg:transition-none';

/** รายการเมนู (hook aq-nav-item — target audit 44px) */
const NAV_ITEM =
  'aq-nav-item group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-base text-foreground no-underline ' +
  'transition-colors duration-fast ease-hover visited:text-foreground hover:bg-accent hover:text-foreground ' +
  'aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground ' +
  'aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-2 aria-[current=page]:before:left-0 ' +
  'aria-[current=page]:before:w-0.5 aria-[current=page]:before:rounded-full ' +
  'aria-[current=page]:before:bg-primary';

/** ไอคอนเมนู: เทา · active = primary */
const NAV_ICON = '!text-muted-foreground group-aria-[current=page]:!text-primary';

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
      {open && (
        <div className="fixed inset-0 z-drawer animate-fade-in bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        ref={ref} id="app-sidebar" className={`${SIDEBAR}${open ? ' is-open' : ''}`} data-open={open || undefined}
        aria-label="เมนูหลัก" onKeyDown={onKeyDown}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 px-4">
          <Link href="/app" aria-label="AUN-QA Copilot หน้าหลัก" className="inline-flex min-w-0 no-underline">
            <Brand size={20} />
          </Link>
          <Button
            variant="ghost" size="icon" className="border-transparent bg-transparent lg:hidden"
            aria-label="ปิดเมนู" onClick={onClose}
          >
            <Icon name="x" size={20} />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="เมนูหลัก">
          {groups.map(g => {
            const items = g.items.filter(i => i.show);
            if (!items.length) return null;
            return (
              <div key={g.key} className="mt-5 first:mt-2">
                {/* !mt-0: กฎเดิม .aq-nav-group:first-child (legacy.css) — ระยะห่างอยู่ที่ div แทน */}
                <p className="aq-nav-group !mt-0 flex items-center gap-1 px-3 pb-1" id={`navg-${g.key}`}>{g.title}</p>
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
        {/* ปุ่มล่างเต็มความกว้างชิดซ้าย — DisplayPrefsButton (S1) ไม่รับ className จึงจัดผ่าน selector ลูก */}
        <div className="sticky bottom-0 grid gap-1 border-t bg-background p-3 [&>*>.aq-btn]:w-full [&>*>.aq-btn]:justify-start [&>*]:w-full">
          <DisplayPrefsButton />
          <Button
            variant="ghost" className="w-full justify-start border-transparent bg-transparent"
            data-testid="logout" onClick={onLogout}
          >
            <Icon name="log-out" size={20} />ออกจากระบบ
          </Button>
        </div>
      </aside>
    </>
  );
}
