'use client';

/**
 * Landing nav (ADR-UI-001 pages.md P1) — sticky 72px · ≥768 ลิงก์ในแถว · <768 hamburger → แผงเต็มจอ
 * แผงมือถือ: ปุ่ม 44, Esc / ปุ่ม x ปิด, focus trap, คืน focus ปุ่มเมนู · ล็อกอินอยู่ = "เข้าสู่แอป →"
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LangToggle from '@/components/ui/LangToggle';
import Icon from '@/components/ui/Icon';
import { Brand } from '@/components/ui/BrandMark';

const LINKS = [
  { href: '#about', label: 'จุดเด่น' },
  { href: '#flow', label: 'ขั้นตอนใช้งาน' },
  { href: '#trust', label: 'ทำไมเชื่อถือได้' },
];

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
    <header className="aq-lnav">
      <Link href="/" aria-label="AUN-QA Copilot หน้าแรก" className="aq-brand-link"><Brand size={24} /></Link>
      <nav aria-label="เมนูหน้าแรก">
        <ul className="aq-lnav__links">
          {LINKS.map(l => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          <li><LangToggle /></li>
          <li>
            <a href={user ? '/app' : '/login'} className="aq-btn aq-btn-primary" data-testid="landing-login" onClick={go}>
              {cta}<Icon name="chevron-right" size={20} />
            </a>
          </li>
        </ul>
      </nav>
      <button
        ref={burger} type="button" className="aq-btn aq-btn-icon aq-lnav__burger"
        aria-label="เปิดเมนู" aria-expanded={open} aria-controls="landing-menu" onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={20} />
      </button>
      {open && (
        <div ref={panel} id="landing-menu" className="aq-lnav__panel" role="dialog" aria-modal="true" aria-label="เมนู" onKeyDown={onKey}>
          <div className="aq-row-between">
            <Brand size={24} />
            <button type="button" className="aq-btn aq-btn-ghost aq-btn-icon" aria-label="ปิดเมนู" onClick={close}>
              <Icon name="x" size={20} />
            </button>
          </div>
          {LINKS.map(l => <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>)}
          <LangToggle />
          <a href={user ? '/app' : '/login'} className="aq-btn aq-btn-primary" onClick={go}>
            {cta}<Icon name="chevron-right" size={20} />
          </a>
        </div>
      )}
    </header>
  );
}
