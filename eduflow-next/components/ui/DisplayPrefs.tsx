'use client';

/**
 * ตัวปรับการแสดงผล (ADR-UI-001 T2.4, C6 ส่วนล่าง sidebar, P2 login)
 * - FontScaleSeg: segmented "ก | ก+ | ก++" (role=radiogroup) เขียน `aunqa_ui_prefs.fontScale`
 * - DisplayPrefsButton: ปุ่ม "การแสดงผล" (ไอคอน type) เปิด popover: ขนาดตัวอักษร + สวิตช์ "เอฟเฟกต์ฉลอง"
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { FONT_SCALES, useUiPrefs } from '@/lib/ui/prefs';
import Icon from './Icon';

export function FontScaleSeg({ testId }: { testId?: string }) {
  const [prefs, setPrefs] = useUiPrefs();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, FONT_SCALES.findIndex(f => f.value === prefs.fontScale));

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (idx + d + FONT_SCALES.length) % FONT_SCALES.length;
    setPrefs({ fontScale: FONT_SCALES[n].value });
    refs.current[n]?.focus();
  }

  return (
    <div className="aq-seg" role="radiogroup" aria-label="ขนาดตัวอักษร" data-testid={testId} onKeyDown={onKey}>
      {FONT_SCALES.map((f, i) => (
        <button
          key={f.value} ref={el => { refs.current[i] = el; }}
          type="button" role="radio" aria-checked={i === idx} aria-label={f.aria} tabIndex={i === idx ? 0 : -1}
          onClick={() => setPrefs({ fontScale: f.value })}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function DisplayPrefsButton() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useUiPrefs();
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  return (
    <div className="aq-popwrap">
      <button
        ref={btn} type="button" className="aq-btn aq-btn-ghost" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(o => !o)} data-testid="display-prefs"
      >
        <Icon name="type" size={20} />การแสดงผล
      </button>
      {open && (
        <div ref={pop} id={id} className="aq-popover aq-popover--up" role="group" aria-label="การแสดงผล">
          <p className="aq-label">ขนาดตัวอักษร</p>
          <FontScaleSeg />
          <label className="aq-check">
            <input type="checkbox" role="switch" checked={prefs.effects} onChange={e => setPrefs({ effects: e.target.checked })} />
            เอฟเฟกต์ฉลอง
          </label>
        </div>
      )}
    </div>
  );
}
