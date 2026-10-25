'use client';

/**
 * ตัวปรับการแสดงผล (ADR-UI-001 T2.4, C6 ส่วนล่าง sidebar, P2 login · หน้าตา ADR-UI-002 saas-spec §C11 segmented, §C14 popover)
 * - FontScaleSeg: segmented "ก | ก+ | ก++" (role=radiogroup) เขียน `aunqa_ui_prefs.fontScale`
 * - DisplayPrefsButton: ปุ่ม "การแสดงผล" (ไอคอน type) เปิด popover ขึ้นด้านบน: ขนาดตัวอักษร + ธีม (ThemeSegment) + สวิตช์ "เอฟเฟกต์ฉลอง"
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { FONT_SCALES, useUiPrefs } from '@/lib/ui/prefs';
import { Button } from './primitives/button';
import { ThemeSegment } from './ThemeToggle';
import Icon from './Icon';

/** segmented แบบเดียวกับ ThemeSegment (§C11) */
const SEG_WRAP = 'inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1';
const SEG_ITEM =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-transparent px-3 text-base font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-sm';

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
    <div className={SEG_WRAP} role="radiogroup" aria-label="ขนาดตัวอักษร" data-testid={testId} onKeyDown={onKey}>
      {FONT_SCALES.map((f, i) => (
        <button
          key={f.value} ref={el => { refs.current[i] = el; }}
          type="button" role="radio" aria-checked={i === idx} aria-label={f.aria} tabIndex={i === idx ? 0 : -1}
          className={SEG_ITEM}
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
    <div className="relative">
      <Button
        ref={btn} variant="ghost" className="w-full justify-start border-transparent bg-transparent" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(o => !o)} data-testid="display-prefs"
      >
        <Icon name="type" size={20} className="text-muted-foreground" />การแสดงผล
      </Button>
      {open && (
        <div
          ref={pop} id={id} role="group" aria-label="การแสดงผล"
          className="absolute bottom-full left-0 z-toast mb-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg animate-pop-in dark:shadow-none"
        >
          <p className="font-medium text-foreground">การแสดงผล</p>
          <div className="space-y-2">
            <p className="text-base text-foreground">ขนาดตัวอักษร</p>
            <FontScaleSeg />
          </div>
          <div className="space-y-2 border-t pt-3">
            <p className="text-base text-foreground">ธีม</p>
            <ThemeSegment />
          </div>
          <div className="border-t pt-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground">
              <input
                type="checkbox" role="switch" className="h-5 w-5 shrink-0 accent-primary"
                checked={prefs.effects} onChange={e => setPrefs({ effects: e.target.checked })}
              />
              เอฟเฟกต์ฉลอง
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
