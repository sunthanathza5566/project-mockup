'use client';

/**
 * ตัวสลับธีม (ADR-UI-002 saas-spec §C16, §C14 · ADR-UI-003 D5 / friendly-spec §F2.3)
 * - ThemeToggleButton: ปุ่มไอคอน ghost 44×44 สลับ สว่าง↔มืด — **เลิกใช้แล้วในรอบ 2** (คง export ไว้จน R2-F2 เอาออกจาก login/landing)
 * - ThemeSegment: radiogroup 3 ค่า "สว่าง" / "มืด" / "ตามเครื่อง" (ใช้ใน DisplayPrefsPanel) — ลูกศรเลื่อนค่าได้แบบ FontScaleSeg
 * ทั้งสองแสดง placeholder ขนาดเท่ากันจน mounted (ธีมจริงรู้ได้เฉพาะฝั่ง client — กัน hydration mismatch)
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/ui/cn';
import { Button } from '@/components/ui/primitives/button';
import Icon, { type IconName } from './Icon';

type ThemeValue = 'light' | 'dark' | 'system';

const THEMES: { value: ThemeValue; label: string; icon: IconName }[] = [
  { value: 'light', label: 'สว่าง', icon: 'sun' },
  { value: 'dark', label: 'มืด', icon: 'moon' },
  { value: 'system', label: 'ตามเครื่อง', icon: 'monitor' }, // ADR-UI-003 §F12 (เดิม "ตามระบบ")
];

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}

export function ThemeToggleButton({ className, testId = 'theme-toggle' }: { className?: string; testId?: string }) {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return <span aria-hidden="true" className={cn('inline-block h-11 w-11 shrink-0', className)} />;
  }

  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด';
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      data-testid={testId}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={20} />
    </Button>
  );
}

/**
 * segmented กลางของรอบ 2 (friendly-spec §F2.1/§F2.3) — ใช้ร่วม ThemeSegment, FontScaleSeg, LangSwitch
 * กรอบ border-input บน card (คู่ #15) · ที่เลือก = พื้น primary-muted + ตัวหนา (คู่ #12) ทั้ง aria-checked (radio) และ aria-pressed (ปุ่มภาษา)
 * ไม่ตกบรรทัดภายในตัวเอง (flex-nowrap + whitespace-nowrap) · ปุ่มย่อยสูง 44 (target audit วัดรายปุ่ม — §F10)
 * bg-transparent/py-0/border-0: กัน UA style ของ <button> ช่วง preflight ปิด
 */
export const SEGMENT_WRAP =
  'inline-flex max-w-full flex-nowrap items-center gap-1 rounded-lg border border-input bg-card p-1';
export const SEGMENT_ITEM =
  'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border-0 bg-transparent px-2.5 py-0 text-base font-medium text-muted-foreground transition-colors duration-fast hover:bg-accent hover:text-foreground aria-checked:bg-primary-muted aria-checked:font-semibold aria-checked:text-foreground aria-pressed:bg-primary-muted aria-pressed:font-semibold aria-pressed:text-foreground';
const SEG_WRAP = SEGMENT_WRAP;
const SEG_ITEM = SEGMENT_ITEM;

export function ThemeSegment({ testId = 'theme-segment' }: { testId?: string }) {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current: ThemeValue = theme === 'light' || theme === 'dark' ? theme : 'system';
  const idx = THEMES.findIndex(t => t.value === current);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (idx + d + THEMES.length) % THEMES.length;
    setTheme(THEMES[n].value);
    refs.current[n]?.focus();
  }

  if (!mounted) {
    // placeholder โครงเดียวกัน (ปุ่มไม่โฟกัสได้) จน mounted
    return (
      <div className={SEG_WRAP} aria-hidden="true">
        {THEMES.map(t => (
          <span key={t.value} className={SEG_ITEM}>
            <Icon name={t.icon} size={16} />
            {t.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={SEG_WRAP} role="radiogroup" aria-label="ธีม" data-testid={testId} onKeyDown={onKey}>
      {THEMES.map((t, i) => (
        <button
          key={t.value}
          ref={el => { refs.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={i === idx}
          tabIndex={i === idx ? 0 : -1}
          className={SEG_ITEM}
          onClick={() => setTheme(t.value)}
          data-testid={`${testId}-${t.value}`}
        >
          <Icon name={t.icon} size={16} />
          {t.label}
        </button>
      ))}
    </div>
  );
}
