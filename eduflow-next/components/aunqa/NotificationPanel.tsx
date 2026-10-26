'use client';

/**
 * กระดิ่ง + panel แจ้งเตือน (ADR-UI-003 D6 / friendly-spec §F2.2, §F3)
 * - ปุ่ม `nav-bell` (button, aria-expanded/aria-controls, aria-label เดิม "แจ้งเตือนที่ยังไม่อ่าน N รายการ" — E2E-08)
 *   ป้าย "แจ้งเตือน" ที่ ≥1024 · ตัวนับ `.aq-count` ท้ายป้าย (desktop) / มุมขวาบนไอคอน (มือถือ) · animate-bump ครั้งเดียวเมื่อเพิ่ม
 *   นับใหม่เมื่อ: เปลี่ยนหน้า, `aunqa:todos-changed`, `storage` ของ `aunqa_notifications` (แท็บอื่น) · จำนวนที่เพิ่มประกาศผ่าน live region
 * - ≥768 popover (non-modal, ไม่ trap focus) ตำแหน่ง fixed ใต้กระดิ่งชิดขวา บีบใน clientWidth (ไม่ดันหน้าล้น)
 *   <768 sheet เต็มจอ (aria-modal, focus trap, ล็อก scroll ของ body, ปุ่ม "ปิด")
 *   ปิดเมื่อ Esc (คืน focus ที่กระดิ่ง), คลิกนอก (desktop), กดรายการ, เปลี่ยนหน้า
 * - โหลดรายการตอนเปิดเท่านั้น (30 รายการล่าสุด) · รายการทั้งแถวเป็นลิงก์ → markRead + แจ้ง todos-changed + ปิด → ไปปลายทาง
 * - กล่องรายการ data-no-i18n: ข้อความ/เวลา/ป้ายกลุ่มสร้างตามภาษาของหน้าเอง (lib/ui/notification.ts)
 * - ไม่ใช้ portal: panel อยู่ใน <header> — header จึงไม่มี backdrop-filter บนตัวเอง (ดู AppTopbar) เพื่อให้ fixed อิง viewport
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AppNotification, AppUser, NotificationKind } from '@/lib/types';
import { KEYS, listNotifications, markRead, unreadCount } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import { errMsg } from '@/lib/ui/aunqa';
import { cn } from '@/lib/ui/cn';
import { groupByDay, notificationHref, notificationText, relativeTime } from '@/lib/ui/notification';
import { TODOS_CHANGED_EVENT, countLabel, notifyTodosChanged } from '@/lib/ui/todo';
import Icon, { type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives/button';
import { InlineMessage } from './common';

const LIMIT = 30;

/** ไอคอน + กล่องสีตามชนิด — ใช้คู่ tone/tone-muted ในตาราง §E2 (#11, #21, #24, #27, #41) */
const KIND_VIEW: Record<NotificationKind, { icon: IconName; box: string }> = {
  assigned:          { icon: 'user-plus',    box: 'bg-primary-muted text-primary' },
  comment:           { icon: 'message',      box: 'bg-info-muted text-info' },
  changes_requested: { icon: 'undo',         box: 'bg-warning-muted text-warning' },
  approved:          { icon: 'check',        box: 'bg-success-muted text-success' },
  cycle_status:      { icon: 'calendar',     box: 'bg-info-muted text-info' },
  deadline:          { icon: 'clock',        box: 'bg-warning-muted text-warning' },
  access_request:    { icon: 'user-plus',    box: 'bg-clay-muted text-clay' },
  account:           { icon: 'shield-check', box: 'bg-success-muted text-success' },
};

const DESKTOP_MQ = '(min-width: 768px)';
const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function NotificationBell({ user }: { user: AppUser }) {
  const pathname = usePathname() || '';
  const { lang } = useLang();
  const en = lang === 'en';
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [tick, setTick] = useState(0);
  const [unread, setUnread] = useState(0);
  const [bump, setBump] = useState(false);
  const [announce, setAnnounce] = useState('');
  const prev = useRef<number | null>(null);
  const [data, setData] = useState<{ items: AppNotification[]; total: number; now: number } | null>(null);
  const [error, setError] = useState('');

  // นับใหม่: หน้าที่เปลี่ยนสถานะงาน/อ่านแจ้งเตือน dispatch todos-changed · แท็บอื่นเขียน aunqa_notifications (storage event)
  useEffect(() => {
    const on = () => setTick(t => t + 1);
    const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === KEYS.notifications) on(); };
    window.addEventListener(TODOS_CHANGED_EVENT, on);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(TODOS_CHANGED_EVENT, on);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    let n = 0;
    try { n = unreadCount(user); } catch { n = 0; }
    setUnread(n);
    if (prev.current !== null && n > prev.current) {
      prev.current = n;
      setAnnounce(`แจ้งเตือนที่ยังไม่อ่าน ${n} รายการ`);
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      return () => clearTimeout(t);
    }
    prev.current = n;
  }, [user, pathname, tick]);

  // popover (≥768) / sheet (<768)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // ปิดเมื่อเปลี่ยนหน้า
  useEffect(() => { setOpen(false); }, [pathname]);

  // โหลดรายการตอนเปิด (และเมื่อมีการเปลี่ยนระหว่างเปิด) — ไม่ render รายการตอนปิด
  useEffect(() => {
    if (!open) { setData(null); setError(''); return; }
    try {
      const all = listNotifications(user);
      setData({ items: all.slice(0, LIMIT), total: all.length, now: Date.now() });
      setError('');
    } catch (e) {
      setError(errMsg(e));
    }
  }, [open, user, tick]);

  const close = useCallback((focusBell: boolean) => {
    setOpen(false);
    if (focusBell) setTimeout(() => btn.current?.focus(), 0);
  }, []);

  // desktop: วาง panel ใต้กระดิ่งชิดขวา โดยไม่ล้น clientWidth (lesson U2-F1)
  useLayoutEffect(() => {
    if (!open || !desktop) { setPos(null); return; }
    const place = () => {
      const b = btn.current?.getBoundingClientRect();
      if (!b) return;
      const vw = document.documentElement.clientWidth;
      const w = panel.current?.offsetWidth ?? 0;
      let right = Math.max(8, vw - b.right);
      if (vw - right - w < 8) right = Math.max(8, vw - w - 8);
      setPos({ top: Math.round(b.bottom + 8), right: Math.round(right) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, desktop]);

  // Esc ปิด · desktop คลิกนอกปิด
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(true); } };
    const onDown = (e: MouseEvent) => {
      if (!desktop) return;
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, desktop, close]);

  // มือถือ: ล็อก scroll ของ body + focus หัว sheet
  useEffect(() => {
    if (!open || desktop) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open, desktop]);

  /** focus trap ใน sheet (มือถือเท่านั้น — desktop เป็น popover non-modal) */
  function onPanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (desktop || e.key !== 'Tab' || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(TABBABLE)).filter(n => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function readOne(n: AppNotification) {
    if (!n.readAt) { markRead(user, n.id); notifyTodosChanged(); }
    setOpen(false);
  }

  function readAll() {
    markRead(user);
    notifyTodosChanged();
    heading.current?.focus(); // ปุ่มจะ disabled — ย้าย focus ไม่ให้หลุดไป body
  }

  const count = countLabel(unread);
  const groups = data ? groupByDay(data.items, data.now) : [];

  return (
    <div className="relative shrink-0">
      <Button
        ref={btn} variant="ghost"
        className="relative w-11 gap-2 px-0 lg:w-auto lg:px-3"
        data-testid="nav-bell"
        aria-haspopup="dialog" aria-expanded={open} aria-controls="noti-panel"
        aria-label={`แจ้งเตือนที่ยังไม่อ่าน ${unread} รายการ`}
        onClick={() => setOpen(o => !o)}
      >
        <Icon name="bell" size={20} />
        <span className="hidden lg:inline">แจ้งเตือน</span>
        {count && (
          <span className={cn('aq-count absolute right-0.5 top-0.5 lg:static', bump && 'animate-bump')} aria-hidden="true">{count}</span>
        )}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">{announce}</span>

      {open && (
        <div
          ref={panel} id="noti-panel" data-testid="noti-panel"
          role="dialog" aria-labelledby="noti-h" aria-modal={desktop ? undefined : true}
          onKeyDown={onPanelKeyDown}
          className={desktop
            ? 'fixed z-dialog flex w-[26rem] max-w-[calc(100vw-1rem)] flex-col rounded-xl border bg-popover text-popover-foreground shadow-lg animate-pop-in dark:shadow-none'
            : 'fixed inset-0 z-dialog flex flex-col bg-background text-foreground animate-sheet-in'}
          style={desktop ? { top: pos?.top ?? 72, right: pos?.right ?? 8 } : undefined}
        >
          <div
            className={cn(
              'flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b',
              desktop ? 'px-4 py-3' : 'sticky top-0 min-h-topbar bg-card px-4 py-2',
            )}
          >
            <h2 ref={heading} id="noti-h" tabIndex={-1} className="m-0 text-lg font-semibold text-foreground" data-autofocus>
              การแจ้งเตือน
            </h2>
            <span className="aq-meta" data-no-i18n="">{en ? `(${unread} unread)` : `(ยังไม่อ่าน ${unread})`}</span>
            <span className="flex-1" />
            {/* V1 m7: disabled ของ ghost ไม่มีพื้น (เดิม bg-muted ทำให้เด่นกว่าปุ่ม "ปิด" ที่ใช้ได้) — เหลือแค่สีตัวอักษร muted */}
            <Button
              variant="ghost" size="compact" className="disabled:bg-transparent"
              disabled={unread === 0} onClick={readAll} data-testid="noti-read-all"
            >
              <Icon name="check" size={20} />อ่านทั้งหมด
            </Button>
            {!desktop && (
              <Button variant="outline" size="compact" onClick={() => close(true)} data-testid="noti-close">
                <Icon name="x" size={20} />ปิด
              </Button>
            )}
          </div>

          {error ? (
            <div className="p-4"><InlineMessage tone="danger" title="โหลดการแจ้งเตือนไม่สำเร็จ">{error}</InlineMessage></div>
          ) : !data ? (
            <p className="aq-meta m-0 px-4 py-6" role="status">กำลังโหลด…</p>
          ) : data.items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center" data-testid="noti-empty">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
                <Icon name="bell" size={24} />
              </span>
              <p className="m-0 font-medium text-foreground">ยังไม่มีการแจ้งเตือน</p>
              <p className="aq-meta m-0 mt-1 max-w-xs">เมื่อมีคนมอบหมายงาน ส่งกลับแก้ หรืออนุมัติ จะแจ้งให้ทราบที่นี่</p>
            </div>
          ) : (
            <>
              <div
                data-testid="noti-list" data-no-i18n=""
                className={cn('overflow-y-auto overscroll-contain pb-2', desktop ? 'max-h-[min(70vh,36rem)]' : 'min-h-0 flex-1')}
              >
                {groups.map(g => (
                  <section key={g.key} aria-labelledby={`noti-g-${g.key}`}>
                    <h3 id={`noti-g-${g.key}`} className="aq-nav-group m-0 px-4 pb-1 pt-3">{en ? g.labelEn : g.labelTh}</h3>
                    <ul className="m-0 list-none p-0">
                      {g.items.map(n => {
                        const isNew = !n.readAt;
                        const v = KIND_VIEW[n.kind] ?? KIND_VIEW.cycle_status;
                        return (
                          <li key={n.id}>
                            <Link
                              href={notificationHref(n)} data-testid={`noti-item-${n.id}`} data-unread={isNew || undefined}
                              onClick={() => readOne(n)}
                              className="flex items-start gap-3 px-4 py-3 text-foreground no-underline transition-colors duration-fast ease-hover visited:text-foreground hover:bg-accent hover:text-foreground"
                            >
                              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', v.box)} aria-hidden="true">
                                <Icon name={v.icon} size={18} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={cn('block break-words text-base', isNew ? 'font-semibold' : 'font-normal')} data-part="msg">
                                  {isNew && <span className="sr-only">{en ? 'Unread: ' : 'ยังไม่อ่าน: '}</span>}
                                  {notificationText(n, lang)}
                                </span>
                                <span className="mt-1 flex flex-wrap items-center gap-2">
                                  {isNew && (
                                    <span className="aq-pill inline-flex items-center rounded-full bg-primary-muted px-2 text-primary">{en ? 'New' : 'ใหม่'}</span>
                                  )}
                                  <span className="aq-meta">{relativeTime(n.createdAt, data.now, lang)}</span>
                                </span>
                              </span>
                              {isNew && <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
              {data.total > LIMIT && <p className="aq-meta m-0 shrink-0 border-t px-4 py-2">แสดง 30 รายการล่าสุด</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
