'use client';

/**
 * คอมโพเนนต์กลางของหน้าในแอป (ADR-UI-001 components.md C8 PageHeader, C9 InlineMessage, C11 Badge,
 * C18 Empty, C19 Skeleton/Loading, C1 AsyncButton loading, pages.md P21 ErrorBox)
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AiRun, AppUser, CycleStatus, EvidenceStatus, HeatLevel, SectionStatus } from '@/lib/types';
import { AunqaError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Icon, { type IconName } from '@/components/ui/Icon';
import { aiModelLabel, errMsg } from '@/lib/ui/aunqa';
import {
  CYCLE_STATUS_VIEW, EVIDENCE_STATUS_VIEW, HEAT_VIEW, SECTION_STATUS_VIEW, TONE_ICON, aiModelView, type Tone,
} from '@/lib/ui/status';

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

// ─── C8 PageHeader ───

export interface Crumb { label: ReactNode; href?: string }

export function PageHeader({ title, sub, actions, crumbs, status }: {
  title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: Crumb[]; status?: ReactNode;
}) {
  return (
    <header className="aq-page-head">
      {crumbs && crumbs.length > 0 && (
        <nav className="aq-crumbs" aria-label="เส้นทางของหน้า">
          <ol>
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={i}>
                  {i > 0 && <Icon name="chevron-right" size={16} />}
                  {c.href && !last
                    ? <Link href={c.href}>{c.label}</Link>
                    : <span aria-current={last ? 'page' : undefined}>{c.label}</span>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="aq-page-head__row">
        <div className="aq-page-head__main">
          <div className="aq-page-head__title">
            <h1 className="aq-h1">{title}</h1>
            {status}
          </div>
          {sub && <p className="aq-muted aq-page-sub">{sub}</p>}
        </div>
        {actions && <div className="aq-page-actions">{actions}</div>}
      </div>
    </header>
  );
}

// ─── C9 InlineMessage ───

export type MsgTone = 'success' | 'warn' | 'danger' | 'info' | 'neutral';
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
      className={`aq-msg aq-msg--${tone}${large ? ' aq-msg--lg' : ''}${className ? ` ${className}` : ''}`}
      role={tone === 'danger' ? 'alert' : 'status'}
      data-testid={testId}
    >
      <Icon name={icon ?? MSG_ICON[tone]} size={20} className="aq-msg__icon" />
      <div className="aq-msg__body">
        {title && <p className="aq-msg__title">{title}</p>}
        {children && <div className="aq-msg__text">{children}</div>}
        {actions && <div className="aq-msg__actions">{actions}</div>}
      </div>
      {onClose && (
        <button type="button" className="aq-btn aq-btn-ghost aq-btn-icon aq-msg__close" aria-label="ปิดข้อความ" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      )}
    </div>
  );
}

// ─── C19 Skeleton + Loading ───

export type SkeletonKind = 'cards' | 'table' | 'editor' | 'dashboard' | 'form';

const Line = ({ w }: { w?: string }) => <span className="aq-skeleton aq-skeleton--line" style={w ? { width: w } : undefined} />;

export function Skeleton({ kind = 'cards' }: { kind?: SkeletonKind }) {
  if (kind === 'table') {
    return (
      <div className="aq-skel aq-skel--table" aria-hidden="true">
        <span className="aq-skeleton aq-skeleton--head" />
        {Array.from({ length: 5 }, (_, i) => <span key={i} className="aq-skeleton aq-skeleton--row" />)}
      </div>
    );
  }
  if (kind === 'editor') {
    return (
      <div className="aq-skel aq-skel--editor" aria-hidden="true">
        <div className="aq-card"><Line w="40%" /><span className="aq-skeleton aq-skeleton--block" /></div>
        <div className="aq-card"><Line /><Line /><Line w="70%" /></div>
      </div>
    );
  }
  if (kind === 'dashboard') {
    return (
      <div className="aq-skel aq-skel--dashboard" aria-hidden="true">
        <div className="aq-skel__kpis">{Array.from({ length: 5 }, (_, i) => <span key={i} className="aq-skeleton aq-skeleton--kpi" />)}</div>
        <div className="aq-card">{Array.from({ length: 8 }, (_, i) => <span key={i} className="aq-skeleton aq-skeleton--row" />)}</div>
      </div>
    );
  }
  if (kind === 'form') {
    return (
      <div className="aq-skel aq-skel--form aq-card" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => <div key={i}><Line w="30%" /><span className="aq-skeleton aq-skeleton--input" /></div>)}
      </div>
    );
  }
  return (
    <div className="aq-skel aq-skel--cards" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => <div key={i} className="aq-card"><Line w="40%" /><Line /><Line /><Line w="80%" /></div>)}
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
    <div className="aq-loading" role="status" aria-live="polite" aria-busy="true" data-testid="state-loading">
      <span className="aq-sr-only">{text}</span>
      {phase === 'skeleton' && <Skeleton kind={skeleton} />}
      {phase === 'slow' && (
        <InlineMessage
          tone="warn" title="ใช้เวลานานกว่าปกติ"
          actions={onRetry ? <button type="button" className="aq-btn" onClick={onRetry}>ลองใหม่</button> : undefined}
        />
      )}
    </div>
  );
}

// ─── P21 ErrorBox ───

export function ErrorBox({ message, onRetry, code }: { message: string; onRetry?: () => void; code?: string }) {
  const denied = code === 'forbidden';
  const missing = code === 'not_found';
  const title = denied ? 'คุณไม่มีสิทธิ์ดูข้อมูลนี้' : missing ? 'ไม่พบข้อมูล' : 'โหลดข้อมูลไม่สำเร็จ';
  const action = denied || missing
    ? <Link className="aq-btn" href="/app">กลับหน้าหลัก</Link>
    : onRetry ? <button type="button" className="aq-btn" onClick={onRetry}>ลองใหม่</button> : undefined;
  return (
    <div className="aq-card aq-state-card">
      <InlineMessage tone="danger" large title={title} testId="state-error" actions={action}>{message}</InlineMessage>
    </div>
  );
}

// ─── C18 Empty ───

/**
 * `title` = หัวข้อ (fs-md 600) · `text` = คำอธิบาย · ถ้าส่งแค่ `text` (รูปแบบเดิม) จะใช้เป็นหัวข้อ
 * `action` หรือ children = ปุ่มทำต่อ · `tip` = ลิงก์คู่มือ/เคล็ดลับ
 */
export function Empty({ title, text, icon = 'folder', action, tip, children }: {
  title?: ReactNode; text?: ReactNode; icon?: IconName; action?: ReactNode; tip?: ReactNode; children?: ReactNode;
}) {
  const head = title ?? text;
  const body = title ? text : undefined;
  return (
    <div className="aq-empty" data-testid="state-empty">
      <span className="aq-empty__art" aria-hidden="true">
        <Icon name={icon} size={40} />
        {icon !== 'bell' && <i className="aq-empty__spark" />}{/* U3-9: จุดบนกระดิ่งดูเหมือนมีแจ้งเตือนค้าง */}
      </span>
      {head && <p className="aq-empty__title">{head}</p>}
      {body && <p className="aq-empty__text">{body}</p>}
      {(action || children) && <div className="aq-empty__actions">{action}{children}</div>}
      {tip && <div className="aq-empty__tip">{tip}</div>}
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

// ─── C11 Badge / Status pill ───

export function Badge({ tone = 'neutral', icon, children, title, testId }: {
  tone?: Tone; icon?: IconName | false; children: ReactNode; title?: string; testId?: string;
}) {
  const ic = icon === false ? null : icon ?? TONE_ICON[tone];
  return (
    <span className={`aq-badge aq-badge-${tone}`} title={title} data-testid={testId}>
      {ic && <Icon name={ic} size={16} />}
      {children}
    </span>
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

/** legend ของ heatmap (C13) — ไม่มี testid ที่ขึ้นต้นด้วย heat- */
export function HeatLegend() {
  const levels: HeatLevel[] = ['empty', 'critical', 'warning', 'ok', 'ready', 'approved'];
  return (
    <div className="aq-legend" aria-label="คำอธิบายสีและไอคอน">
      <ul className="aq-legend__list">
        {levels.map(l => (
          <li key={l}>
            <i className={`aq-heat aq-heat-${l}`}><Icon name={HEAT_VIEW[l].icon} size={16} /></i>
            {HEAT_VIEW[l].label}
          </li>
        ))}
      </ul>
      <p className="aq-legend__note">ไอคอนมุมขวาบน = สถานะการอนุมัติของข้อ</p>
    </div>
  );
}

// ─── C1 AsyncButton (state loading) ───

/** ปุ่ม + สถานะกำลังทำงาน (กันกดซ้ำ) · aria-busy + spinner + ข้อความเฉพาะการกระทำ · ความกว้างไม่กระโดด */
export function AsyncButton({ onClick, children, className = 'aq-btn', disabled, testId, title, busyText = 'กำลังทำงาน…' }: {
  onClick: () => Promise<void> | void; children: ReactNode; className?: string; disabled?: boolean;
  testId?: string; title?: string; busyText?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [minW, setMinW] = useState<number | undefined>(undefined);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button" className={className} disabled={disabled || busy} data-testid={testId} title={title}
      aria-busy={busy || undefined}
      style={busy && minW ? { minWidth: minW } : undefined}
      onClick={async () => {
        setMinW(ref.current?.offsetWidth);
        setBusy(true);
        try { await onClick(); } finally { setBusy(false); }
      }}
    >
      {busy ? <><span className="aq-spinner" aria-hidden="true" />{busyText}</> : children}
    </button>
  );
}

/** แสดงว่า AI run ตอบจาก Claude หรือโหมดในเครื่อง (offline) */
export function ModelBadge({ run }: { run: Pick<AiRun, 'model'> }) {
  const v = aiModelView(run.model);
  return <Badge tone={v.tone} icon={v.icon} title={aiModelLabel(run.model)} testId="ai-model">{v.label}</Badge>;
}
