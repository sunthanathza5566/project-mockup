'use client';

/**
 * Term — คำศัพท์ + ปุ่ม (?) อธิบาย (ADR-UI-001 components.md C17, ลูกเล่น L14 popover)
 * <Term k="pdca">PDCA</Term>
 * - ปุ่ม `.aq-term__btn` help-circle 20 · พื้นที่กด 32×32 (ยกเว้นจาก 44 ใน AC-05 เพราะเป็น inline)
 * - กด / Enter / Space เปิด (ไม่ใช่ hover-only) · hover เปิดได้หลัง 300ms บนอุปกรณ์ที่มีเมาส์ · Esc / คลิกนอก = ปิด
 * - popover `role="tooltip"` + `aria-describedby` จากปุ่ม · วางแบบ fixed และบีบให้อยู่ในจอ (กัน horizontal scroll)
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLang } from '@/context/LangContext';
import { GLOSSARY } from '@/lib/ui/glossary';
import Icon from './Icon';

const POP_W = 320;
const GAP = 8;

export default function Term({ k, children, label }: { k: string; children?: ReactNode; label?: string }) {
  const entry = GLOSSARY[k];
  const { lang, t } = useLang();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const hoverT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect();
    if (!b) return;
    const vw = document.documentElement.clientWidth;
    const width = Math.min(POP_W, vw - GAP * 2);
    const left = Math.min(Math.max(GAP, b.left + b.width / 2 - width / 2), vw - width - GAP);
    setPos({ left, top: b.bottom + GAP, width });
  }, []);

  const show = useCallback(() => { place(); setOpen(true); }, [place]);
  const hide = useCallback(() => { setOpen(false); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { hide(); btn.current?.focus(); } };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) hide();
    };
    const onMove = () => place();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, hide, place]);

  useEffect(() => () => { if (hoverT.current) clearTimeout(hoverT.current); }, []);

  if (!entry) return <>{children}</>;
  const name = label ?? (typeof children === 'string' ? children : entry.titleTh);
  const canHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  return (
    <span className="aq-term">
      {children}
      <button
        ref={btn} type="button" className="aq-term__btn"
        aria-label={`ความหมายของ ${name}`} aria-expanded={open} aria-describedby={open ? id : undefined}
        onClick={() => (open ? hide() : show())}
        onMouseEnter={() => { if (canHover()) hoverT.current = setTimeout(show, 300); }}
        onMouseLeave={() => { if (hoverT.current) clearTimeout(hoverT.current); }}
      >
        <Icon name="help-circle" size={20} />
      </button>
      {open && pos && (
        <span
          ref={pop} id={id} role="tooltip" className="aq-term__pop"
          style={{ left: pos.left, top: pos.top, width: pos.width }}
          data-no-i18n={lang === 'en' ? '' : undefined}
        >
          <span className="aq-term__title">{lang === 'en' ? t(entry.titleTh) : entry.titleTh}</span>
          <span className="aq-term__body">{lang === 'en' ? entry.bodyEn : entry.bodyTh}</span>
        </span>
      )}
    </span>
  );
}
