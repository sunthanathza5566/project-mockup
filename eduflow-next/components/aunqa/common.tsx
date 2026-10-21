'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppUser, CycleStatus, EvidenceStatus, HeatLevel, SectionStatus } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { CYCLE_STATUS_TH, HEAT_TH, SECTION_STATUS_TH, errMsg } from '@/lib/ui/aunqa';

/** user ปัจจุบัน (AppShell การันตีว่าไม่ null เมื่อ render children) */
export function useMe(): AppUser {
  const { user } = useAuth();
  return user as AppUser;
}

interface LoadState<T> { data?: T; error?: string; loading: boolean }

/**
 * โหลดข้อมูลแบบมี state loading/error + reload() — fn อ่านจาก store (sync) หรือ async ก็ได้
 * fn รันใหม่เมื่อ deps เปลี่ยน
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
        e => { if (alive) setState({ error: errMsg(e), loading: false }); },
      );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  return { ...state, reload };
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="aq-page-head">
      <div>
        <h1 className="aq-h1">{title}</h1>
        {sub && <p className="aq-muted aq-page-sub">{sub}</p>}
      </div>
      {actions && <div className="aq-page-actions">{actions}</div>}
    </div>
  );
}

export function Loading({ text = 'กำลังโหลด…' }: { text?: string }) {
  return <div className="aq-state" role="status" data-testid="state-loading">{text}</div>;
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="aq-state aq-state-err" role="alert" data-testid="state-error">
      <div>{message}</div>
      {onRetry && <button type="button" className="aq-btn aq-btn-sm" style={{ marginTop: '0.6rem' }} onClick={onRetry}>ลองใหม่</button>}
    </div>
  );
}
export function Empty({ text, children }: { text: string; children?: ReactNode }) {
  return <div className="aq-state" data-testid="state-empty"><div>{text}</div>{children}</div>;
}

/** แสดง state loading/error ก่อน แล้วค่อยเรียก children เมื่อมี data */
export function Async<T>({ q, children }: {
  q: { data?: T; error?: string; loading: boolean; reload: () => void }; children: (d: T) => ReactNode;
}) {
  if (q.loading) return <Loading />;
  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  if (q.data === undefined) return <Empty text="ไม่พบข้อมูล" />;
  return <>{children(q.data)}</>;
}

export function Badge({ tone = 'neutral', children, title, testId }: {
  tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'info'; children: ReactNode; title?: string; testId?: string;
}) {
  return <span className={`aq-badge aq-badge-${tone}`} title={title} data-testid={testId}>{children}</span>;
}

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  const tone = status === 'final_approved' || status === 'closed' || status === 'assessed' ? 'ok'
    : status === 'revision_requested' ? 'bad' : status === 'draft' ? 'neutral' : 'info';
  return <Badge tone={tone} testId="cycle-status">{CYCLE_STATUS_TH[status]}</Badge>;
}
export function SectionStatusBadge({ status }: { status: SectionStatus }) {
  const tone = status === 'approved' ? 'ok' : status === 'changes_requested' ? 'bad'
    : status === 'ready_for_review' ? 'info' : status === 'drafting' ? 'warn' : 'neutral';
  return <Badge tone={tone} testId="section-status">{SECTION_STATUS_TH[status]}</Badge>;
}
export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  return (
    <Badge tone={status === 'verified' ? 'ok' : status === 'tagged' ? 'info' : 'neutral'}>
      {status === 'verified' ? 'ตรวจสอบแล้ว' : status === 'tagged' ? 'ติดแท็กแล้ว' : 'อัปโหลดแล้ว'}
    </Badge>
  );
}
export function HeatLegend() {
  const levels: HeatLevel[] = ['empty', 'critical', 'warning', 'ok', 'ready', 'approved'];
  return (
    <div className="aq-legend" aria-label="คำอธิบายสี">
      {levels.map(l => <span key={l}><i className={`aq-heat aq-heat-${l}`} />{HEAT_TH[l]}</span>)}
    </div>
  );
}

/** ปุ่ม + สถานะกำลังทำงาน (กันกดซ้ำ) */
export function AsyncButton({ onClick, children, className = 'aq-btn', disabled, testId, title }: {
  onClick: () => Promise<void> | void; children: ReactNode; className?: string; disabled?: boolean; testId?: string; title?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button" className={className} disabled={disabled || busy} data-testid={testId} title={title}
      onClick={async () => { setBusy(true); try { await onClick(); } finally { setBusy(false); } }}
    >
      {busy ? 'กำลังทำ…' : children}
    </button>
  );
}
