'use client';

/**
 * คอมโพเนนต์กลางของหน้าในแอป — หน้าตา Modern SaaS (ADR-UI-002 saas-spec §C1 AsyncButton, §C4 Badge, §C6 PageHeader,
 * §C7 InlineMessage, §C15 Empty/Loading/ErrorBox) · logic/props/testid/role/ข้อความ เหมือน ADR-UI-001 เดิมทุกตัว
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AiRun, AppUser, CycleStatus, EvidenceStatus, HeatLevel, SectionStatus } from '@/lib/types';
import { AunqaError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Icon, { type IconName } from '@/components/ui/Icon';
import { Button, type ButtonProps } from '@/components/ui/primitives/button';
import { Badge as BadgePrimitive } from '@/components/ui/primitives/badge';
import { Skeleton as SkeletonBlock } from '@/components/ui/primitives/skeleton';
import { cn } from '@/lib/ui/cn';
import { HEAT_CLASS, MSG_TONE, type MsgTone } from '@/lib/ui/tone';
import { aiModelLabel, errMsg } from '@/lib/ui/aunqa';
import {
  CYCLE_STATUS_VIEW, EVIDENCE_STATUS_VIEW, HEAT_VIEW, SECTION_STATUS_VIEW, TONE_ICON, aiModelView, type Tone,
} from '@/lib/ui/status';

/** type ของโทน InlineMessage ประกาศที่ `lib/ui/tone.ts` (S1) — re-export ให้ผู้เรียกเดิม import จากไฟล์นี้ได้ */
export type { MsgTone };

/** user ปัจจุบัน (AppShell การันตีว่าไม่ null เมื่อ render children) */
export function useMe(): AppUser {
  const { user } = useAuth();
  return user as AppUser;
}

interface LoadState<T> { data?: T; error?: string; errorCode?: string; loading: boolean }

/**
 * โหลดข้อมูลแบบมี state loading/error + reload() — fn อ่านจาก store (sync) หรือ async ก็ได้
 * fn รันใหม่เมื่อ deps เปลี่ยน · เก็บ `errorCode` (AunqaError.code) ให้ ErrorBox เลือกข้อความ
 */
export function useLoad<T>(fn: () => T | Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<LoadState<T>>({ loading: true });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => fnRef.current())
      .then(
        data => { if (alive) setState({ data, loading: false }); },
        e => { if (alive) setState({ error: errMsg(e), errorCode: e instanceof AunqaError ? e.code : undefined, loading: false }); },
      );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  return { ...state, reload };
}

// ─── §C6 PageHeader ───

export interface Crumb { label: ReactNode; href?: string }

export function PageHeader({ title, sub, actions, crumbs, status }: {
  title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: Crumb[]; status?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav className="aq-crumbs mb-2" aria-label="เส้นทางของหน้า">
          <ol className="flex list-none flex-wrap items-center gap-1">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={i} className="inline-flex min-w-0 items-center gap-1">
                  {i > 0 && <Icon name="chevron-right" size={16} className="text-muted-foreground" />}
                  {c.href && !last
                    ? <Link href={c.href} className="text-muted-foreground transition-colors duration-fast hover:text-foreground">{c.label}</Link>
                    : <span aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-foreground' : undefined}>{c.label}</span>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            {status}
          </div>
          {sub && <p className="max-w-[46rem] text-base text-muted-foreground">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
      </div>
    </header>
  );
}

// ─── §C7 InlineMessage ───

const MSG_ICON: Record<MsgTone, IconName> = {
  success: 'check-circle', warn: 'alert-triangle', danger: 'x-circle', info: 'info', neutral: 'circle-dashed',
};

export function InlineMessage({ tone = 'info', title, children, actions, onClose, testId, id, className, large, icon }: {
  tone?: MsgTone; icon?: IconName; title?: ReactNode; children?: ReactNode; actions?: ReactNode; onClose?: () => void;
  testId?: string; id?: string; className?: string; large?: boolean;
}) {
  return (
    <div
      id={id}
      className={cn('flex gap-3 rounded-lg border text-foreground', large ? 'p-5' : 'p-4', MSG_TONE[tone].box, className)}
      role={tone === 'danger' ? 'alert' : 'status'}
      data-testid={testId}
    >
      <Icon name={icon ?? MSG_ICON[tone]} size={20} className={cn('mt-0.5', MSG_TONE[tone].icon)} />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className={cn('font-medium text-foreground', large && 'text-lg')}>{title}</p>}
        {children && <div className="text-base text-foreground">{children}</div>}
        {actions && <div className="flex flex-wrap gap-2 pt-2">{actions}</div>}
      </div>
      {onClose && (
        <Button variant="ghost" size="icon" className="-my-2 -mr-2 shrink-0 border-transparent bg-transparent" aria-label="ปิดข้อความ" onClick={onClose}>
          <Icon name="x" size={20} />
        </Button>
      )}
    </div>
  );
}

// ─── §C15 Skeleton + Loading ───

export type SkeletonKind = 'cards' | 'table' | 'editor' | 'dashboard' | 'form';

const CARD = 'rounded-lg border bg-card p-4 shadow-sm dark:shadow-none md:p-6';
const Line = ({ w }: { w?: string }) => <SkeletonBlock className="h-4" style={w ? { width: w } : undefined} />;

export function Skeleton({ kind = 'cards' }: { kind?: SkeletonKind }) {
  if (kind === 'table') {
    return (
      <div className={cn(CARD, 'space-y-3')} aria-hidden="true">
        <SkeletonBlock className="h-10" />
        {Array.from({ length: 5 }, (_, i) => <SkeletonBlock key={i} className="h-8" />)}
      </div>
    );
  }
  if (kind === 'editor') {
    return (
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]" aria-hidden="true">
        <div className={cn(CARD, 'space-y-4')}><Line w="40%" /><SkeletonBlock className="h-96" /></div>
        <div className={cn(CARD, 'space-y-3')}><Line /><Line /><Line w="70%" /></div>
      </div>
    );
  }
  if (kind === 'dashboard') {
    return (
      <div className="space-y-6" aria-hidden="true">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => <SkeletonBlock key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className={cn(CARD, 'space-y-3')}>{Array.from({ length: 8 }, (_, i) => <SkeletonBlock key={i} className="h-8" />)}</div>
      </div>
    );
  }
  if (kind === 'form') {
    return (
      <div className={cn(CARD, 'space-y-5')} aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => <div key={i} className="space-y-1.5"><Line w="30%" /><SkeletonBlock className="h-11" /></div>)}
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => <div key={i} className={cn(CARD, 'space-y-3')}><Line w="40%" /><Line /><Line /><Line w="80%" /></div>)}
    </div>
  );
}

const SKELETON_DELAY_MS = 300;
const SLOW_MS = 10_000;

/** container role=status (testid state-loading) · ไม่แสดงอะไร 300ms แรก → Skeleton → เกิน 10 วินาทีขึ้นคำเตือน + ลองใหม่ */
export function Loading({ text = 'กำลังโหลด…', skeleton = 'cards', onRetry }: {
  text?: string; skeleton?: SkeletonKind; onRetry?: () => void;
}) {
  const [phase, setPhase] = useState<'wait' | 'skeleton' | 'slow'>('wait');
  useEffect(() => {
    const a = setTimeout(() => setPhase('skeleton'), SKELETON_DELAY_MS);
    const b = setTimeout(() => setPhase('slow'), SLOW_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <div role="status" aria-live="polite" aria-busy="true" data-testid="state-loading">
      <span className="sr-only">{text}</span>
      {phase === 'skeleton' && <Skeleton kind={skeleton} />}
      {phase === 'slow' && (
        <InlineMessage
          tone="warn" title="ใช้เวลานานกว่าปกติ"
          actions={onRetry ? <Button variant="outline" onClick={onRetry}>ลองใหม่</Button> : undefined}
        />
      )}
    </div>
  );
}

// ─── P21 ErrorBox (§C15: InlineMessage danger + ปุ่ม outline) ───

export function ErrorBox({ message, onRetry, code }: { message: string; onRetry?: () => void; code?: string }) {
  const denied = code === 'forbidden';
  const missing = code === 'not_found';
  const title = denied ? 'คุณไม่มีสิทธิ์ดูข้อมูลนี้' : missing ? 'ไม่พบข้อมูล' : 'โหลดข้อมูลไม่สำเร็จ';
  const action = denied || missing
    ? <Button asChild variant="outline" className="visited:text-foreground"><Link href="/app">กลับหน้าหลัก</Link></Button>
    : onRetry ? <Button variant="outline" onClick={onRetry}>ลองใหม่</Button> : undefined;
  return (
    <InlineMessage tone="danger" large title={title} testId="state-error" actions={action}>{message}</InlineMessage>
  );
}

// ─── §C15 Empty ───

/**
 * `title` = หัวข้อ (text-lg 600) · `text` = คำอธิบาย · ถ้าส่งแค่ `text` (รูปแบบเดิม) จะใช้เป็นหัวข้อ
 * `action` หรือ children = ปุ่มทำต่อ · `tip` = ลิงก์คู่มือ/เคล็ดลับ
 */
export function Empty({ title, text, icon = 'folder', action, tip, children }: {
  title?: ReactNode; text?: ReactNode; icon?: IconName; action?: ReactNode; tip?: ReactNode; children?: ReactNode;
}) {
  const head = title ?? text;
  const body = title ? text : undefined;
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed bg-card px-6 py-12 text-center" data-testid="state-empty">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      {head && <p className="text-lg font-semibold text-foreground">{head}</p>}
      {body && <p className="mt-1 max-w-md text-base text-muted-foreground">{body}</p>}
      {(action || children) && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}{children}</div>}
      {tip && <div className="mt-4 max-w-md text-base text-muted-foreground">{tip}</div>}
    </div>
  );
}

/** แสดง state loading/error ก่อน แล้วค่อยเรียก children เมื่อมี data */
export function Async<T>({ q, children, skeleton }: {
  q: { data?: T; error?: string; errorCode?: string; loading: boolean; reload: () => void };
  children: (d: T) => ReactNode;
  skeleton?: SkeletonKind;
}) {
  if (q.loading) return <Loading skeleton={skeleton} onRetry={q.reload} />;
  if (q.error) return <ErrorBox message={q.error} code={q.errorCode} onRetry={q.reload} />;
  if (q.data === undefined) return <Empty title="ไม่พบข้อมูล" />;
  return <>{children(q.data)}</>;
}

// ─── §C4 Badge / Status pill (สี + ไอคอน + ข้อความ) ───

export function Badge({ tone = 'neutral', icon, children, title, testId }: {
  tone?: Tone; icon?: IconName | false; children: ReactNode; title?: string; testId?: string;
}) {
  const ic = icon === false ? null : icon ?? TONE_ICON[tone];
  return (
    <BadgePrimitive tone={tone} title={title} data-testid={testId}>
      {ic && <Icon name={ic} size={14} />}
      {children}
    </BadgePrimitive>
  );
}

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  const v = CYCLE_STATUS_VIEW[status];
  return <Badge tone={v.tone} icon={v.icon} testId="cycle-status">{v.label}</Badge>;
}
export function SectionStatusBadge({ status }: { status: SectionStatus }) {
  const v = SECTION_STATUS_VIEW[status];
  return <Badge tone={v.tone} icon={v.icon} testId="section-status">{v.label}</Badge>;
}
export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  const v = EVIDENCE_STATUS_VIEW[status];
  return <Badge tone={v.tone} icon={v.icon}>{v.label}</Badge>;
}

/** legend ของ heatmap (§C9) — ไม่มี testid ที่ขึ้นต้นด้วย heat- · ตัวอย่างช่องใช้ HEAT_CLASS ชุดเดียวกับช่องจริง */
export function HeatLegend() {
  const levels: HeatLevel[] = ['empty', 'critical', 'warning', 'ok', 'ready', 'approved'];
  return (
    <div className="aq-legend" aria-label="คำอธิบายสีและไอคอน">
      <ul className="flex list-none flex-wrap gap-x-4 gap-y-2">
        {levels.map(l => (
          <li key={l} className="inline-flex items-center gap-2 text-foreground">
            <span className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border', HEAT_CLASS[l])}>
              <Icon name={HEAT_VIEW[l].icon} size={14} />
            </span>
            {HEAT_VIEW[l].label}
          </li>
        ))}
      </ul>
      <p className="mt-2">ไอคอนมุมขวาบน = สถานะการอนุมัติของข้อ</p>
    </div>
  );
}

// ─── §C1 AsyncButton (state loading) ───

type BtnVariant = NonNullable<ButtonProps['variant']>;
type BtnSize = NonNullable<ButtonProps['size']>;

/** class ปุ่มแบบเดิม (ADR-UI-001) → variant/size ของ Button — ผู้เรียกที่ยังส่ง className เดิมได้หน้าตาใหม่ทันที */
const LEGACY_BTN = /^aq-btn(?:-primary|-danger|-danger-solid|-ghost|-compact|-icon|-block)?$/;
function fromLegacy(className: string): { variant: BtnVariant; size: BtnSize; rest: string } {
  const cls = className.split(/\s+/).filter(Boolean);
  const has = (c: string) => cls.includes(c);
  const variant: BtnVariant = has('aq-btn-danger-solid') ? 'destructive'
    : has('aq-btn-danger') ? 'destructiveOutline'
    : has('aq-btn-primary') ? 'default'
    : has('aq-btn-ghost') ? 'ghost'
    : 'outline';
  const size: BtnSize = has('aq-btn-icon') ? 'icon' : has('aq-btn-compact') ? 'compact' : 'default';
  const rest = cls.filter(c => !LEGACY_BTN.test(c));
  if (has('aq-btn-block')) rest.push('w-full');
  return { variant, size, rest: rest.join(' ') };
}

/**
 * ปุ่ม + สถานะกำลังทำงาน (กันกดซ้ำ) · aria-busy + ไอคอน loader หมุน + ข้อความเฉพาะการกระทำ · ความกว้างไม่กระโดด
 * หน้าตา: ส่ง `variant`/`size` (ใหม่) หรือ className แบบเดิม (`aq-btn aq-btn-primary aq-btn-compact` …) ก็ได้
 */
export function AsyncButton({ onClick, children, className = 'aq-btn', variant, size, disabled, testId, title, busyText = 'กำลังทำงาน…' }: {
  onClick: () => Promise<void> | void; children: ReactNode; className?: string; disabled?: boolean;
  testId?: string; title?: string; busyText?: string; variant?: BtnVariant; size?: BtnSize;
}) {
  const [busy, setBusy] = useState(false);
  const [minW, setMinW] = useState<number | undefined>(undefined);
  const ref = useRef<HTMLButtonElement>(null);
  const legacy = fromLegacy(className);
  return (
    <Button
      ref={ref}
      variant={variant ?? legacy.variant} size={size ?? legacy.size} className={legacy.rest}
      disabled={disabled || busy} data-testid={testId} title={title}
      aria-busy={busy || undefined}
      style={busy && minW ? { minWidth: minW } : undefined}
      onClick={async () => {
        setMinW(ref.current?.offsetWidth);
        setBusy(true);
        try { await onClick(); } finally { setBusy(false); }
      }}
    >
      {busy ? <><Icon name="loader" size={16} className="animate-spin" />{busyText}</> : children}
    </Button>
  );
}

/** แสดงว่า AI run ตอบจาก Claude หรือโหมดในเครื่อง (offline) */
export function ModelBadge({ run }: { run: Pick<AiRun, 'model'> }) {
  const v = aiModelView(run.model);
  return <Badge tone={v.tone} icon={v.icon} title={aiModelLabel(run.model)} testId="ai-model">{v.label}</Badge>;
}
