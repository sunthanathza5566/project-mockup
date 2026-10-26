'use client';

/**
 * Landing nav (ADR-UI-001 pages.md P1 · TASK-0002 saas-spec §P1) — sticky h-16 border-b bg-background/80 backdrop-blur
 * ≥768 ลิงก์ในแถว + ปุ่ม landing-login (outline) + ภาษา + "การแสดงผล" (display-menu, friendly-spec §F9)
 * <768 (V1 m5) แถวเดียว: แบรนด์ + ภาษา + ปุ่ม "☰ เมนู" (`landing-menu-btn` มีข้อความ — AC-21) → แผงเต็มจอ
 *   แผงมี ลิงก์ + เข้าสู่ระบบ (`landing-menu-login`) + การแสดงผล (`landing-menu-display`, DisplayPrefsPanel)
 *   display-menu ยังอยู่ใน DOM แต่ซ่อนด้วย CSS ที่ <768 (testid เดียว ไม่ render ซ้ำ)
 * LangSwitch อยู่บนแถบ nav นอกเมนูทุกขนาดจอ (AC-22, BUG-0002-Q2C-1) — ไม่ซ้ำในแผงมือถือ
 * แผงมือถือ: ปุ่ม 44, Esc / ปุ่ม "ปิด" (`landing-menu-close`), focus trap, คืน focus ปุ่มเมนู · ล็อกอินอยู่ = "เข้าสู่แอป →"
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LangToggle from '@/components/ui/LangToggle';
import Icon from '@/components/ui/Icon';
import BrandMark, { Brand } from '@/components/ui/BrandMark';
import { DisplayMenuButton, DisplayPrefsPanel } from '@/components/ui/DisplayPrefs';
import { Button } from '@/components/ui/primitives/button';
import { cn } from '@/lib/ui/cn';

const LINKS = [
  { href: '#about', label: 'จุดเด่น' },
  { href: '#flow', label: 'ขั้นตอนใช้งาน' },
  { href: '#trust', label: 'ทำไมเชื่อถือได้' },
];

/** ปุ่ม ghost ช่วงเปลี่ยนผ่าน: กันพื้น/ขอบของกฎ .aq-btn ใน legacy.css (ลบได้หลัง S6) */
const GHOST_FIX = 'border-transparent bg-transparent';
const LINK =
  'inline-flex min-h-11 items-center rounded-md px-3 text-base font-medium text-muted-foreground no-underline ' +
  'transition-colors duration-fast ease-hover visited:text-muted-foreground hover:bg-accent hover:text-foreground';
const PANEL_LINK =
  'flex min-h-11 items-center rounded-md px-3 text-base font-medium text-foreground no-underline ' +
  'visited:text-foreground hover:bg-accent hover:text-foreground';

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const burger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cta = user ? 'เข้าสู่แอป' : 'เข้าสู่ระบบ';

  useEffect(() => { if (open) panel.current?.querySelector<HTMLElement>('button, a')?.focus(); }, [open]);

  function close() { setOpen(false); setTimeout(() => burger.current?.focus(), 0); }
  function go(e: React.MouseEvent) { e.preventDefault(); setOpen(false); router.push(user ? '/app' : '/login'); }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return (
    <header className="sticky top-0 z-topbar border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-screen-xl flex-nowrap items-center justify-end gap-2 px-3 md:px-6">
        <Link href="/" aria-label="AUN-QA Copilot หน้าแรก" className="mr-auto inline-flex min-w-0 items-center no-underline md:mr-4">
          {/* <768 แบรนด์เล็กลง (mark 28 + ข้อความ 16px) ให้ แบรนด์ + ภาษา + เมนู พอดีแถวเดียวที่ 390 · ขยายตัวอักษรแล้วไม่พอ = ตัดท้าย ไม่ h-scroll */}
          <span className="inline-flex min-w-0 items-center gap-2 text-foreground md:hidden">
            <BrandMark size={28} />
            <span className="min-w-0 truncate text-base font-semibold">AUN-QA <span className="font-medium">Copilot</span></span>
          </span>
          <span className="hidden md:inline-flex"><Brand size={24} /></span>
        </Link>
        <nav aria-label="เมนูหน้าแรก" className="hidden min-w-0 flex-1 md:block">
          <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
            {LINKS.map(l => <li key={l.href}><a href={l.href} className={LINK}>{l.label}</a></li>)}
            <li className="ml-auto">
              <Button asChild variant="outline" className="visited:text-foreground">
                <a href={user ? '/app' : '/login'} data-testid="landing-login" onClick={go}>
                  {cta}<Icon name="chevron-right" size={20} />
                </a>
              </Button>
            </li>
          </ul>
        </nav>
        {/* <768 (V1 m5): แถวเดียว [แบรนด์][ไทย│EN][☰ เมนู] — "การแสดงผล" ย้ายเข้าแผงเมนู · ปุ่มภาษาอยู่นอกเมนูเสมอ (AC-22)
            ≥768 คงเดิม: ลิงก์ + เข้าสู่ระบบ + ภาษา + การแสดงผล */}
        <LangToggle className="shrink-0 max-md:[&_button]:px-2" />
        <DisplayMenuButton label="การแสดงผล" className="hidden md:block" />
        <Button
          ref={burger} variant="ghost" className={cn(GHOST_FIX, 'shrink-0 gap-1.5 px-2 md:hidden')}
          aria-expanded={open} aria-controls="landing-menu" onClick={() => setOpen(true)} data-testid="landing-menu-btn"
        >
          <Icon name="menu" size={20} />เมนู
        </Button>
      </div>
      {open && (
        <div
          ref={panel} id="landing-menu" role="dialog" aria-modal="true" aria-label="เมนู" onKeyDown={onKey}
          className="fixed inset-0 z-drawer flex animate-fade-in-base flex-col gap-2 overflow-y-auto bg-background p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <Brand size={24} />
            <Button variant="ghost" className={cn(GHOST_FIX, 'shrink-0 gap-1.5 px-3')} onClick={close} data-testid="landing-menu-close">
              <Icon name="x" size={20} />ปิด
            </Button>
          </div>
          {LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={PANEL_LINK}>{l.label}</a>
          ))}
          <Button asChild className="mt-2 visited:text-primary-foreground">
            <a href={user ? '/app' : '/login'} onClick={go} data-testid="landing-menu-login">
              {cta}<Icon name="chevron-right" size={20} />
            </a>
          </Button>
          {/* การแสดงผล (<768 อยู่ในแผงนี้แทนปุ่มบนแถบ — V1 m5) · ตัวเดียวกับเมนูผู้ใช้/หน้า login */}
          <section className="mt-4 border-t pt-4" aria-labelledby="landing-display-h" data-testid="landing-menu-display">
            <h2 id="landing-display-h" className="aq-nav-group m-0 pb-2">การแสดงผล</h2>
            <DisplayPrefsPanel />
          </section>
        </div>
      )}
    </header>
  );
}
