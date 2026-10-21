'use client';

/**
 * Stepper (ADR-UI-001 components.md C21, ลูกเล่น L6 + L8)
 * - แนวนอน ≥768 · ต่ำกว่า md แสดงแบบย่อ "ขั้น 2 จาก 4: เขียนเนื้อหา" + จุด
 * - `<ol>` + aria-current="step" ที่ขั้นปัจจุบัน
 * - variant "nav": ขั้นเป็นลิงก์ (href="#step-…") หรือปุ่ม (onSelect) — ไม่บังคับลำดับ
 * - variant "track": อ่านอย่างเดียว (แถบสถานะรอบ)
 * - ขั้นที่เพิ่งเปลี่ยนเป็น done ในหน้านั้น → เส้นเช็กวาด (L6) · เส้นเชื่อมเติม scaleX (L8, CSS transition)
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type StepState = 'done' | 'current' | 'todo';

export interface StepItem {
  key: string;
  label: ReactNode;
  /** สถานะย่อ เช่น "ผูกแล้ว 3 ชิ้น" */
  meta?: ReactNode;
  state: StepState;
  href?: string;
  onSelect?: () => void;
  testId?: string;
}

export interface StepperProps {
  steps: StepItem[];
  variant?: 'nav' | 'track';
  ariaLabel: string;

  testId?: string;
}

/** วาดเครื่องหมายถูกในวงกลม (L6) — `drawn` = เพิ่งเสร็จในหน้านี้ */
function StepCheck({ drawn }: { drawn: boolean }) {
  return (
    <svg className={`aq-check-draw${drawn ? ' is-drawn' : ''}`} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  );
}

export default function Stepper({ steps, variant = 'nav', ariaLabel, testId }: StepperProps) {
  const prev = useRef<Record<string, StepState> | null>(null);
  const [justDone, setJustDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    const now: Record<string, StepState> = {};
    const fresh = new Set<string>();
    for (const s of steps) {
      now[s.key] = s.state;
      if (prev.current && prev.current[s.key] && prev.current[s.key] !== 'done' && s.state === 'done') fresh.add(s.key);
    }
    prev.current = now;
    if (fresh.size) setJustDone(fresh);
  }, [steps]);

  const curIdx = Math.max(0, steps.findIndex(s => s.state === 'current'));
  const cur = steps[curIdx];

  return (
    <nav className={`aq-stepper aq-stepper--${variant}`} aria-label={ariaLabel} data-testid={testId}>
      <p className="aq-stepper__compact">
        <span className="aq-stepper__compact-text">
          ขั้น {curIdx + 1} จาก {steps.length}: {cur?.label}
        </span>
        <span className="aq-stepper__dots" aria-hidden="true">
          {steps.map((s, i) => <i key={s.key} className={`is-${s.state}${i === curIdx ? ' is-here' : ''}`} />)}
        </span>
      </p>
      <ol className="aq-stepper__list">
        {steps.map((s, i) => {
          const marker = s.state === 'done'
            ? <StepCheck drawn={justDone.has(s.key)} />
            : <span className="aq-step__no">{i + 1}</span>;
          const body = (
            <>
              <span className="aq-step__dot" aria-hidden="true">{marker}</span>
              <span className="aq-step__text">
                <span className="aq-step__label">{s.label}</span>
                {s.meta && <span className="aq-step__meta">{s.meta}</span>}
                <span className="aq-sr-only">{s.state === 'done' ? ' (เสร็จแล้ว)' : s.state === 'current' ? ' (ขั้นปัจจุบัน)' : ''}</span>
              </span>
            </>
          );
          const interactive = variant === 'nav' && (s.href || s.onSelect);
          return (
            <li key={s.key} className={`aq-step is-${s.state}`} aria-current={s.state === 'current' ? 'step' : undefined}>
              {i > 0 && (
                <span className="aq-step__line" aria-hidden="true">
                  <i className={steps[i - 1].state === 'done' ? 'is-filled' : ''} />
                </span>
              )}
              {interactive && s.href ? (
                <a className="aq-step__hit" href={s.href} data-testid={s.testId} onClick={s.onSelect ? () => s.onSelect!() : undefined}>{body}</a>
              ) : interactive ? (
                <button type="button" className="aq-step__hit" data-testid={s.testId} onClick={s.onSelect}>{body}</button>
              ) : (
                <span className="aq-step__hit" data-testid={s.testId}>{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { StepCheck };
