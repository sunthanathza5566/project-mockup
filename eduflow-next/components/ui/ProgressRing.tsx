'use client';

/**
 * ProgressRing + ProgressBar (ADR-UI-001 components.md C20, ลูกเล่น L2)
 * - วงพื้น surface-2, แท่งค่า primary (คู่ #40) · เป็น success (คู่ #41) เฉพาะเมื่อ 100% และ `clean` (ไม่มีช่องว่างวิกฤต)
 * - ไม่ใช้ accent เป็นแท่งค่าในทุกกรณี (U1b F4)
 * - เติมค่าจาก 0 → ค่าจริงตอน mount และเมื่อค่าเปลี่ยน (stroke-dashoffset / scaleX, --dur-progress) · reduced-motion = ทันที (CSS)
 * - ค่าต้องมาจากข้อมูลจริงเท่านั้น
 */
import { useEffect, useState, type ReactNode } from 'react';

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
}

export default function ProgressRing({ value, max, center, caption, ariaLabel, clean = false, size = 'lg', testId }: ProgressRingProps) {
  const px = size === 'sm' ? 56 : 120;
  const stroke = size === 'sm' ? 6 : 10;
  const r = (px - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = ratio(value, max);
  const shown = useAnimatedRatio(target);
  const done = target >= 1 && clean;
  return (
    <div className={`aq-ring aq-ring--${size}${done ? ' is-success' : ''}`} role="img" aria-label={ariaLabel} data-testid={testId}>
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-hidden="true" focusable="false">
        <circle className="aq-ring__track" cx={px / 2} cy={px / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="aq-ring__value" cx={px / 2} cy={px / 2} r={r} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown)}
          transform={`rotate(-90 ${px / 2} ${px / 2})`}
        />
      </svg>
      <span className="aq-ring__mid" aria-hidden="true">
        <span className="aq-ring__num">{center ?? `${value}/${max}`}</span>
        {caption && size === 'lg' && <span className="aq-ring__cap aq-meta">{caption}</span>}
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
}

export function ProgressBar({ value, max, label, ariaLabel, testId }: ProgressBarProps) {
  const target = ratio(value, max);
  const shown = useAnimatedRatio(target);
  return (
    <div className="aq-progress" data-testid={testId}>
      <span className="aq-progress__label">{label}</span>
      <span
        className="aq-progress__track" role="progressbar"
        aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
      >
        <span className="aq-progress__fill" style={{ transform: `scaleX(${shown})` }} />
      </span>
    </div>
  );
}
