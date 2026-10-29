'use client';

/**
 * ProgressRing + ProgressBar (ADR-UI-001 components.md C20, ลูกเล่น L2 · หน้าตา ADR-UI-002 saas-spec §C10)
 * - track muted, แท่งค่า primary (คู่ #10) · เป็น success (คู่ #38) เฉพาะเมื่อ 100% และ `clean` (ไม่มีช่องว่างวิกฤต)
 * - ห้ามใช้สีอื่นเป็นแท่งค่า (tests/contrast.test.ts กฎ ง ตรวจไฟล์นี้)
 * - เติมค่าจาก 0 → ค่าจริงตอน mount และเมื่อค่าเปลี่ยน (dashoffset / scaleX, duration-progress) · reduced-motion = ทันที (globals.css)
 * - ค่าต้องมาจากข้อมูลจริงเท่านั้น
 */
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

function ratio(value: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/** ค่าที่แสดง — เริ่ม 0 แล้วเปลี่ยนเป็นค่าจริงในเฟรมถัดไป (ให้ transition ทำงาน) */
function useAnimatedRatio(target: number): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return shown;
}

export interface ProgressRingProps {
  value: number;
  max: number;
  /** ข้อความกลางวง (ค่าเริ่มต้น "value/max") เช่น "85%" */
  center?: ReactNode;
  /** label ใต้ตัวเลข (fs-sm) */
  caption?: ReactNode;
  /** บังคับ — เช่น "อนุมัติแล้ว 45 จาก 53 ข้อ" */
  ariaLabel: string;
  /** ไม่มีช่องว่างวิกฤต → ครบ 100% แล้วเป็นสี success */
  clean?: boolean;
  size?: 'lg' | 'sm';
  testId?: string;
  /** class เพิ่มของกล่องนอก (ระยะ/ตำแหน่งในหน้า) */
  className?: string;
}

export default function ProgressRing({ value, max, center, caption, ariaLabel, clean = false, size = 'lg', testId, className }: ProgressRingProps) {
  const px = size === 'sm' ? 56 : 120;
  const stroke = size === 'sm' ? 6 : 10;
  const r = (px - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = ratio(value, max);
  const shown = useAnimatedRatio(target);
  const done = target >= 1 && clean;
  return (
    <div
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: px, height: px }}
      role="img" aria-label={ariaLabel} data-testid={testId}
    >
      <svg className="block h-full w-full" width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden="true" focusable="false">
        <circle className="stroke-muted" cx={px / 2} cy={px / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className={cn('transition-all duration-progress ease-move', done ? 'stroke-success' : 'stroke-primary')}
          cx={px / 2} cy={px / 2} r={r} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown)}
          transform={`rotate(-90 ${px / 2} ${px / 2})`}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
        <span className={cn('font-semibold tabular-nums text-foreground', size === 'sm' ? 'text-base' : 'text-xl')}>{center ?? `${value}/${max}`}</span>
        {caption && size === 'lg' && <span className="aq-progress__label">{caption}</span>}
      </span>
    </div>
  );
}

export interface ProgressBarProps {
  value: number;
  max: number;
  /** ข้อความเหนือแท่ง เช่น "อนุมัติ 45/53" */
  label: ReactNode;
  /** ข้อความสำหรับ screen reader (ค่าเริ่มต้น = label ถ้าเป็น string) */
  ariaLabel?: string;
  testId?: string;
  /** class เพิ่มของกล่องนอก (เช่น ขนาดใน flex ของหน้า) */
  className?: string;
}

export function ProgressBar({ value, max, label, ariaLabel, testId, className }: ProgressBarProps) {
  const target = ratio(value, max);
  const shown = useAnimatedRatio(target);
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)} data-testid={testId}>
      <span className="aq-progress__label tabular-nums">{label}</span>
      <span
        className="block h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar"
        aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
      >
        <span className="block h-full origin-left bg-primary transition-transform duration-progress ease-move" style={{ transform: `scaleX(${shown})` }} />
      </span>
    </div>
  );
}
