'use client';

/**
 * เมนูผู้ใช้ (ADR-UI-003 D3, D5 / friendly-spec §F2.3)
 * - trigger `user-menu`: avatar (clay-muted — คู่ #41) + ชื่อ (`nav-user`, <768 เป็น sr-only เหมือนเดิม) + บทบาท + chevron
 * - panel `user-menu-panel` = disclosure (ไม่ใช่ role=menu เพราะมี radiogroup/checkbox ข้างใน) — aria-labelledby trigger
 *   หัว: avatar + ชื่อ + บทบาท · อีเมล → "การแสดงผล" (DisplayPrefsPanel ตัวเดียวกับ login/landing) → ออกจากระบบ (`logout`)
 * - ปิดเมื่อ Esc (คืน focus ที่ trigger), คลิกนอก, เปลี่ยนหน้า, กดออกจากระบบ · ไม่ปิดเมื่อเปลี่ยนธีม/ขนาดตัวอักษร
 * - ออกจากระบบ = `onLogout` เดิมของ AuthContext ทั้งก้อน (flush งานค้าง + dialog "ยังบันทึกงานไม่ได้"/conflict เดิม)
 *   คืน focus ที่ trigger ก่อนเรียก เพื่อให้ dialog คืน focus ได้ถ้าผู้ใช้กด "กลับไปแก้"
 */
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { initials, primaryRoleTh } from '@/lib/ui/aunqa';
import { cn } from '@/lib/ui/cn';
import Icon from '@/components/ui/Icon';
import { DisplayPrefsPanel } from '@/components/ui/DisplayPrefs';
import { Button } from '@/components/ui/primitives/button';

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-muted text-base font-semibold text-clay"
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export default function UserMenu({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const pathname = usePathname() || '';
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus(); }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  function logout() {
    setOpen(false);
    btn.current?.focus();
    onLogout();
  }

  const role = primaryRoleTh(user);
  return (
    <div className="relative min-w-0 shrink">
      <Button
        ref={btn} id="user-menu-trigger" variant="ghost"
        className="w-11 min-w-0 max-w-full justify-start gap-2 px-0 py-1 text-left md:w-auto md:px-2"
        data-testid="user-menu"
        aria-haspopup="true" aria-expanded={open} aria-controls="user-menu-panel"
        onClick={() => setOpen(o => !o)}
      >
        <span className="mx-auto inline-flex md:mx-0"><Avatar name={user.fullName} /></span>
        <span className="sr-only md:not-sr-only md:flex md:min-w-0 md:flex-col md:items-start">
          <span className="block max-w-[12rem] truncate font-medium text-foreground" data-testid="nav-user">{user.fullName}</span>
          <span className="aq-meta block max-w-[12rem] truncate">{role}</span>
        </span>
        <Icon name="chevron-down" size={16} className={cn('hidden text-muted-foreground transition-transform duration-fast md:inline-block', open && 'rotate-180')} />
      </Button>

      {open && (
        <div
          ref={pop} id="user-menu-panel" data-testid="user-menu-panel" aria-labelledby="user-menu-trigger"
          className="absolute right-0 top-full z-dialog mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg animate-pop-in dark:shadow-none"
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={user.fullName} />
            <div className="min-w-0 flex-1">
              <p className="m-0 break-words font-semibold text-foreground">{user.fullName}</p>
              <p className="aq-meta m-0 break-words">{role}</p>
              {/* V1 m8: อีเมลบรรทัดเดียว ตัดท้ายด้วย … (ไม่ตัดกลางโดเมน) + title ให้เห็นเต็ม */}
              {user.email && (
                <p className="aq-meta m-0 truncate" title={user.email} data-no-i18n="" data-testid="user-menu-email">{user.email}</p>
              )}
            </div>
          </div>
          <div className="border-t" />
          <p className="aq-nav-group m-0 px-3 pb-2 pt-3">การแสดงผล</p>
          <DisplayPrefsPanel className="px-3 pb-3" />
          <div className="border-t" />
          <Button variant="ghost" className="mt-1 w-full justify-start" data-testid="logout" onClick={logout}>
            <Icon name="log-out" size={20} />ออกจากระบบ
          </Button>
        </div>
      )}
    </div>
  );
}
