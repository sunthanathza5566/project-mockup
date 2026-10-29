'use client';

/**
 * ตัวปรับการแสดงผล (ADR-UI-003 D5 / friendly-spec §F2.3, §F5, §F9 — แทน saas-spec §C14 ย่อหน้า DisplayPrefs)
 * - FontScaleSeg: segmented "ปกติ | ใหญ่ | ใหญ่มาก" (role=radiogroup) เขียน `aunqa_ui_prefs.fontScale`
 * - DisplayPrefsPanel: เนื้อหา "การแสดงผล" ชุดเดียวทั้งระบบ — ขนาดตัวอักษร + ธีม (ThemeSegment) + เอฟเฟกต์ฉลอง
 *     ไม่มีหัวข้อ/ปุ่มออกจากระบบในตัว (UserMenu ใส่หัวข้อ "การแสดงผล" เอง · DisplayMenuButton ใส่หัวข้อใน popover)
 *     เปลี่ยนค่าแล้วไม่ปิดอะไร — ผู้ใช้เห็นผลทันทีแล้วปรับต่อได้
 * - DisplayMenuButton: ปุ่มมีข้อความ "การแสดงผล" (ไอคอน type) เปิด popover DisplayPrefsPanel — ใช้ใน login/landing (testid `display-menu`)
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { FONT_SCALES, useUiPrefs, type FontScale } from '@/lib/ui/prefs';
import { cn } from '@/lib/ui/cn';
import { Button } from './primitives/button';
import { ThemeSegment, SEGMENT_WRAP, SEGMENT_ITEM } from './ThemeToggle';
import Icon from './Icon';

/** ป้ายคำแทนสัญลักษณ์ ก / ก+ / ก++ (friendly-spec §F0, §F12) */
const SCALE_LABEL: Record<FontScale, string> = { 1: 'ปกติ', 1.125: 'ใหญ่', 1.25: 'ใหญ่มาก' };

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
    <div className={SEGMENT_WRAP} role="radiogroup" aria-label="ขนาดตัวอักษร" data-testid={testId} onKeyDown={onKey}>
      {FONT_SCALES.map((f, i) => (
        <button
          key={f.value} ref={el => { refs.current[i] = el; }}
          type="button" role="radio" aria-checked={i === idx} tabIndex={i === idx ? 0 : -1}
          className={SEGMENT_ITEM}
          onClick={() => setPrefs({ fontScale: f.value })}
        >
          {SCALE_LABEL[f.value]}
        </button>
      ))}
    </div>
  );
}

const ROW = 'flex flex-wrap items-center justify-between gap-x-3 gap-y-2';

/** เนื้อหา "การแสดงผล" (contract: props `className?` เท่านั้น — TASK-0002 แผนรอบ 2) */
export function DisplayPrefsPanel({ className }: { className?: string }) {
  const [prefs, setPrefs] = useUiPrefs();
  return (
    <div role="group" aria-label="การแสดงผล" className={cn('space-y-3', className)}>
      <div className={ROW}>
        <span className="text-base text-foreground">ขนาดตัวอักษร</span>
        <FontScaleSeg />
      </div>
      <div className={ROW}>
        <span className="text-base text-foreground">ธีม</span>
        <ThemeSegment />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground">
        <input
          type="checkbox" className="h-5 w-5 shrink-0 accent-primary"
          checked={prefs.effects} onChange={e => setPrefs({ effects: e.target.checked })}
        />
        เอฟเฟกต์ฉลอง (เมื่อรอบสำเร็จ)
      </label>
    </div>
  );
}

/** popover แบบ disclosure: Esc ปิด + คืน focus ที่ปุ่ม · คลิกนอกปิด · ไม่มี focus trap (§F10) */
function useDisclosure(btn: RefObject<HTMLElement>, pop: RefObject<HTMLElement>) {
  const [open, setOpen] = useState(false);
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
  }, [open, btn, pop]);
  return [open, setOpen] as const;
}

const POPOVER =
  'absolute z-toast w-80 max-w-[calc(100vw-1rem)] space-y-3 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg animate-pop-in dark:shadow-none';

/**
 * ปุ่ม "การแสดงผล" ที่มีข้อความ (login/landing — friendly-spec §F5, §F9) เปิด popover ชิดขวาใต้ปุ่ม
 * `label` ค่าเริ่ม "การแสดงผล" · `shortLabel` (ถ้าให้) แสดงแทน label ที่ <768 เช่น "แสดงผล" บน landing
 */
export function DisplayMenuButton({ label = 'การแสดงผล', shortLabel, className }: { label?: string; shortLabel?: string; className?: string }) {
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useDisclosure(btn, pop);

  return (
    <div className={cn('relative shrink-0', className)}>
      <Button
        ref={btn} variant="ghost" className="gap-2 px-3"
        aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(o => !o)} data-testid="display-menu"
      >
        <Icon name="type" size={20} className="text-muted-foreground" />
        {shortLabel ? (
          <>
            <span className="hidden md:inline">{label}</span>
            <span className="md:hidden">{shortLabel}</span>
          </>
        ) : label}
        <Icon name="chevron-down" size={16} className="text-muted-foreground" />
      </Button>
      {open && (
        <div ref={pop} id={id} className={cn(POPOVER, 'right-0 top-full mt-2')} data-testid="display-menu-panel">
          <p className="font-semibold text-foreground">การแสดงผล</p>
          <DisplayPrefsPanel />
        </div>
      )}
    </div>
  );
}
