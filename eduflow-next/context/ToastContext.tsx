'use client';

/**
 * Toast แบบคิว (ADR-UI-001 components.md C14, ลูกเล่น L4)
 * - API เดิม `showToast(msg, type?)` + option ที่สาม `{ action?, durationMs? }`
 * - คิวสูงสุด 3 อัน (ใหม่อยู่ล่าง) — อันเก่าสุดถูกนำออกเมื่อเกิน
 * - ระยะเวลา: success/info 5,000 ms · error 8,000 ms · มี action 8,000 ms (pages.md P9) · durationMs = 0 → ค้างจนปิด
 * - hover/focus = หยุดนับ (pause/resume) · timer เก็บใน useRef ต่อ toast id (แก้บั๊ก clearTimeout ไม่ทำงานของเดิม)
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastAction { label: string; onClick: () => void }
export interface ToastOptions { action?: ToastAction; durationMs?: number }

export interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
  action?: ToastAction;
  /** 0 = ค้างจนปิด */
  durationMs: number;
  paused: boolean;
  leaving: boolean;
}

interface ToastContextValue {
  showToast: (msg: string, type?: ToastType, opts?: ToastOptions) => void;
  toasts: ToastItem[];
  dismiss: (id: number) => void;
  pause: (id: number) => void;
  resume: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {}, toasts: [], dismiss: () => {}, pause: () => {}, resume: () => {},
});

const MAX_TOASTS = 3;
const EXIT_MS = 150;
export const TOAST_DURATION: Record<ToastType, number> = { success: 5000, info: 5000, error: 8000 };
const ACTION_DURATION = 8000;

interface Timer { handle: ReturnType<typeof setTimeout> | null; start: number; remaining: number }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, Timer>());
  const exits = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const seq = useRef(0);

  const clearTimer = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t?.handle) clearTimeout(t.handle);
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback((id: number) => {
    clearTimer(id);
    if (exits.current.has(id)) return;
    setToasts(list => list.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    exits.current.set(id, setTimeout(() => {
      exits.current.delete(id);
      setToasts(list => list.filter(t => t.id !== id));
    }, EXIT_MS));
  }, [clearTimer]);

  const schedule = useCallback((id: number, ms: number) => {
    if (ms <= 0) return;
    const handle = setTimeout(() => dismiss(id), ms);
    timers.current.set(id, { handle, start: Date.now(), remaining: ms });
  }, [dismiss]);

  const showToast = useCallback((msg: string, type: ToastType = 'success', opts?: ToastOptions) => {
    const id = ++seq.current;
    const durationMs = opts?.durationMs ?? (opts?.action ? ACTION_DURATION : TOAST_DURATION[type]);
    setToasts(list => {
      const live = list.filter(t => !t.leaving);
      // เกินคิว → นำอันเก่าสุดออก (ทันที ไม่ทับกัน)
      const drop = live.length >= MAX_TOASTS ? live.slice(0, live.length - MAX_TOASTS + 1).map(t => t.id) : [];
      drop.forEach(d => clearTimer(d));
      return [...list.filter(t => !drop.includes(t.id)), { id, msg, type, action: opts?.action, durationMs, paused: false, leaving: false }];
    });
    schedule(id, durationMs);
  }, [schedule, clearTimer]);

  const pause = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (!t || !t.handle) return;
    clearTimeout(t.handle);
    timers.current.set(id, { handle: null, start: t.start, remaining: Math.max(0, t.remaining - (Date.now() - t.start)) });
    setToasts(list => list.map(x => (x.id === id ? { ...x, paused: true } : x)));
  }, []);

  const resume = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (!t || t.handle) return;
    timers.current.delete(id);
    schedule(id, t.remaining);
    setToasts(list => list.map(x => (x.id === id ? { ...x, paused: false } : x)));
  }, [schedule]);

  useEffect(() => {
    const ts = timers.current;
    const ex = exits.current;
    return () => {
      ts.forEach(t => t.handle && clearTimeout(t.handle));
      ex.forEach(h => clearTimeout(h));
    };
  }, []);

  const value = useMemo(() => ({ showToast, toasts, dismiss, pause, resume }), [showToast, toasts, dismiss, pause, resume]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext);
}
