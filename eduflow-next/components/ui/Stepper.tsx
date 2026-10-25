'use client';

/**
 * Stepper (ADR-UI-001 components.md C21, ลูกเล่น L6 + L8 · หน้าตา ADR-UI-002 saas-spec §C10)
 * - แนวนอน ≥1024 (lg) · ต่ำกว่านั้นแสดงแบบย่อ "ขั้น 2 จาก 4: เขียนเนื้อหา" + จุด
 * - วงเลข h-8 ขอบ 2px: done = primary ทึบ + check · current = ขอบ primary · todo = ขอบ input · เส้นเชื่อม border → primary
 * - `<ol>` + aria-current="step" ที่ขั้นปัจจุบัน
 * - variant "nav": ขั้นเป็นลิงก์ (href="#step-…") หรือปุ่ม (onSelect) — ไม่บังคับลำดับ
 * - variant "track": อ่านอย่างเดียว (แถบสถานะรอบ)
 * - ขั้นที่เพิ่งเปลี่ยนเป็น done ในหน้านั้น → เส้นเช็กวาด (L6) · เส้นเชื่อมเติม scaleX (L8, CSS transition)
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

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
  /** ข้อความแทน "ขั้น x จาก n" ในแบบย่อ (เช่น "อนุมัติแล้ว (ครบ 4 ขั้น)") — U3 UX-U3-9 */
  summary?: ReactNode;
  testId?: string;
}

/** วาดเครื่องหมายถูก (L6) — `drawn` = เพิ่งเสร็จในหน้านี้ (วงเด้ง + เส้นวาด; reduced-motion = ทันทีจาก globals.css) · สี = currentColor */
function StepCheck({ drawn }: { drawn: boolean }) {
  return (
    <svg
      className={cn('inline-block shrink-0 align-[-0.125em]', drawn && 'animate-pop-circle')}
      width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
    >
      <path
        className={drawn ? 'animate-draw' : undefined}
        d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={0}
      />
    </svg>
  );
}

/** วงหมายเลขขั้น (§C10) — แยกบรรทัดต่อสถานะ (กฎ contrast ข ใน tests/contrast.test.ts grep รายบรรทัด) */
const DOT: Record<StepState, string> = {
  done: 'border-primary bg-primary text-primary-foreground',
  current: 'border-primary bg-card text-primary',
  todo: 'border-input bg-card text-muted-foreground',
};
/** จุดในแบบย่อ (<1024) */
const MINI_DOT: Record<StepState | 'here', string> = {
  done: 'border-primary bg-primary',
  here: 'border-primary bg-primary-muted',
  current: 'border-input bg-card',
  todo: 'border-input bg-card',
};

export default function Stepper({ steps, variant = 'nav', ariaLabel, summary, testId }: StepperProps) {
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
  const allDone = steps.length > 0 && steps.every(s => s.state === 'done');

  return (
    <nav className="mb-6" aria-label={ariaLabel} data-testid={testId}>
      <p className="flex flex-wrap items-center justify-between gap-2 font-medium text-foreground lg:hidden">
        <span>
          {summary ?? (allDone ? `ครบ ${steps.length} ขั้นแล้ว` : <>ขั้น {curIdx + 1} จาก {steps.length}: {cur?.label}</>)}
        </span>
        <span className="inline-flex gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={cn('h-2.5 w-2.5 rounded-full border', MINI_DOT[i === curIdx && !allDone && !summary ? 'here' : s.state])}
            />
          ))}
        </span>
      </p>
      <ol className="m-0 hidden list-none items-center p-0 lg:flex">
        {steps.map((s, i) => {
          const marker = s.state === 'done'
            ? <StepCheck drawn={justDone.has(s.key)} />
            : <span className="aq-step__meta font-semibold tabular-nums text-current">{i + 1}</span>;
          const body = (
            <>
              <span
                className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-base', DOT[s.state])}
                aria-hidden="true"
              >
                {marker}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-medium">{s.label}</span>
                {s.meta && <span className="aq-step__meta">{s.meta}</span>}
                <span className="sr-only">{s.state === 'done' ? ' (เสร็จแล้ว)' : s.state === 'current' ? ' (ขั้นปัจจุบัน)' : ''}</span>
              </span>
            </>
          );
          const interactive = variant === 'nav' && (s.href || s.onSelect);
          const hit = 'inline-flex min-h-11 min-w-0 items-center gap-2 rounded-md p-1 pr-2 text-left text-foreground no-underline';
          const hitLive = cn(hit, 'bg-transparent transition-colors duration-fast hover:bg-accent visited:text-foreground');
          return (
            <li
              key={s.key}
              className={cn('flex min-w-0 items-center', i === 0 ? 'flex-initial' : 'flex-1')}
              aria-current={s.state === 'current' ? 'step' : undefined}
            >
              {i > 0 && (
                <span className="relative mx-2 h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
                  <span
                    className={cn(
                      'absolute inset-0 origin-left bg-primary transition-transform duration-slow ease-move',
                      steps[i - 1].state === 'done' ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </span>
              )}
              {interactive && s.href ? (
                <a className={hitLive} href={s.href} data-testid={s.testId} onClick={s.onSelect ? () => s.onSelect!() : undefined}>{body}</a>
              ) : interactive ? (
                <button type="button" className={hitLive} data-testid={s.testId} onClick={s.onSelect}>{body}</button>
              ) : (
                <span className={hit} data-testid={s.testId}>{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { StepCheck };
