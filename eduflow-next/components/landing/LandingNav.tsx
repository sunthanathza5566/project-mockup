'use client';

/**
 * Landing nav (ADR-UI-001 pages.md P1 · TASK-0002 saas-spec §P1) — sticky h-16 border-b bg-background/80 backdrop-blur
 * ≥768 ลิงก์ในแถว + LangToggle + ปุ่ม landing-login (outline) · <768 hamburger → แผงเต็มจอ
 * ปุ่มสลับธีม (theme-toggle) อยู่นอก nav — มองเห็นทุกขนาดจอ มีตัวเดียวในหน้า
 * แผงมือถือ: ปุ่ม 44, Esc / ปุ่ม x ปิด, focus trap, คืน focus ปุ่มเมนู · ล็อกอินอยู่ = "เข้าสู่แอป →"
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LangToggle from '@/components/ui/LangToggle';
import Icon from '@/components/ui/Icon';
import { Brand } from '@/components/ui/BrandMark';
import { ThemeToggleButton } from '@/components/ui/ThemeToggle';
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
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button'));
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return (
    <header className="sticky top-0 z-topbar border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-screen-xl items-center gap-2 px-4 md:px-6">
        <Link href="/" aria-label="AUN-QA Copilot หน้าแรก" className="mr-auto inline-flex min-w-0 items-center no-underline md:mr-4">
          <Brand size={24} />
        </Link>
        <nav aria-label="เมนูหน้าแรก" className="hidden min-w-0 flex-1 md:block">
          <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
            {LINKS.map(l => <li key={l.href}><a href={l.href} className={LINK}>{l.label}</a></li>)}
            <li className="ml-auto"><LangToggle /></li>
            <li>
              <Button asChild variant="outline" className="visited:text-foreground">
                <a href={user ? '/app' : '/login'} data-testid="landing-login" onClick={go}>
                  {cta}<Icon name="chevron-right" size={20} />
                </a>
              </Button>
            </li>
          </ul>
        </nav>
        <ThemeToggleButton className={GHOST_FIX} />
        <Button
          ref={burger} variant="ghost" size="icon" className={cn(GHOST_FIX, 'md:hidden')}
          aria-label="เปิดเมนู" aria-expanded={open} aria-controls="landing-menu" onClick={() => setOpen(true)}
        >
          <Icon name="menu" size={20} />
        </Button>
      </div>
      {open && (
        <div
          ref={panel} id="landing-menu" role="dialog" aria-modal="true" aria-label="เมนู" onKeyDown={onKey}
          className="fixed inset-0 z-drawer flex animate-fade-in-base flex-col gap-2 overflow-y-auto bg-background p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <Brand size={24} />
            <Button variant="ghost" size="icon" className={GHOST_FIX} aria-label="ปิดเมนู" onClick={close}>
              <Icon name="x" size={20} />
            </Button>
          </div>
          {LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={PANEL_LINK}>{l.label}</a>
          ))}
          <div className="mt-2"><LangToggle /></div>
          <Button asChild className="mt-2 visited:text-primary-foreground">
            <a href={user ? '/app' : '/login'} onClick={go}>
              {cta}<Icon name="chevron-right" size={20} />
            </a>
          </Button>
        </div>
      )}
    </header>
  );
}
