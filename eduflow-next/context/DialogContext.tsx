'use client';

/**
 * Dialog กลางจอ — confirm / notify / prompt (API เดิม) · restyle ตาม ADR-UI-001 components.md C15 (ลูกเล่น L14)
 *
 *   - confirm(opts) → Promise<boolean>
 *   - notify(opts)  → Promise<void>          ปุ่มเดียว "รับทราบ"
 *   - prompt(opts)  → Promise<string|null>   textarea · ปุ่มยืนยัน disabled เมื่อ required ว่าง + ข้อความช่วย
 *
 * เพิ่ม: `details` (กล่องรายการเตือน/checklist ใต้ message) · `initialFocus` ('confirm' | 'cancel')
 * focus เริ่มต้น: ปุ่มยกเลิกเมื่อ variant danger/warning หรือ initialFocus='cancel' · textarea สำหรับ prompt · อื่น = ปุ่มยืนยัน
 * ARIA: role="dialog" aria-modal aria-labelledby aria-describedby · focus trap · Esc = ยกเลิก · คลิก backdrop = ยกเลิก
 *       (ยกเว้น prompt ที่พิมพ์แล้ว) · ปิดแล้วคืน focus ให้ element ที่เปิด
 * ชื่อปุ่มยืนยันต้องขึ้นต้นด้วย "ยืนยัน" (E2E) — ผู้เรียกส่ง confirmText เช่น "ยืนยันส่งตรวจ"
 * U-3: เปิด dialog ซ้อนขณะมีตัวเปิดอยู่ = เข้าคิว (ไม่ทับ ไม่ทิ้ง promise/ข้อความที่พิมพ์ค้าง) · แสดงต่อเมื่อตัวก่อนหน้าปิด
 * U-4: dismissAll() ปิดทุกตัว (รวมในคิว) ด้วยค่า "ยกเลิก" — ใช้ตอน session หาย/ออกจากระบบ
 */

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Icon, { type IconName } from '@/components/ui/Icon';

export type DialogVariant = 'primary' | 'danger' | 'success' | 'warning' | 'info';

interface BaseOptions {
  title: string;
  message?: ReactNode;
  /** รายการเตือน / checklist ใต้ message */
  details?: ReactNode;
  variant?: DialogVariant;
  icon?: IconName;
}
interface ConfirmOptions extends BaseOptions {
  confirmText?: string;
  cancelText?: string;
  /** บังคับปุ่มที่ได้ focus เริ่มต้น (ค่าเริ่มต้นตามกฎ C15) */
  initialFocus?: 'confirm' | 'cancel';
  /** false = Esc / คลิกฉากหลังไม่ปิด (ใช้เมื่อปุ่มยกเลิกเป็นการกระทำที่มีผล เช่น ออกจากระบบ) */
  dismissible?: boolean;
}
interface NotifyOptions extends BaseOptions {
  okText?: string;
}
interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}

type Kind = 'confirm' | 'notify' | 'prompt';
interface DialogState {
  kind: Kind;
  title: string;
  message?: ReactNode;
  details?: ReactNode;
  variant: DialogVariant;
  icon: IconName;
  confirmText: string;
  cancelText: string;
  placeholder?: string;
  required?: boolean;
  initialFocus: 'confirm' | 'cancel' | 'input';
  dismissible: boolean;
  defaultText?: string;
  resolve: (v: boolean | string | null) => void;
}

interface DialogContextValue {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  notify:  (o: NotifyOptions)  => Promise<void>;
  prompt:  (o: PromptOptions)  => Promise<string | null>;
  /** ปิดทุก dialog (รวมในคิว) ด้วยค่ายกเลิก */
  dismissAll: () => void;
}

const noop = async () => {};
const DialogContext = createContext<DialogContextValue>({
  confirm: async () => false, notify: noop, prompt: async () => null, dismissAll: () => {},
});

const VARIANT_ICON: Record<DialogVariant, IconName> = {
  primary: 'help-circle', danger: 'alert-triangle', success: 'check-circle', warning: 'alert-triangle', info: 'info',
};
const VARIANT_TONE: Record<DialogVariant, string> = {
  primary: 'primary', danger: 'bad', success: 'ok', warning: 'warn', info: 'info',
};

function defaultFocus(v: DialogVariant, f?: 'confirm' | 'cancel'): 'confirm' | 'cancel' {
  if (f) return f;
  return v === 'danger' || v === 'warning' ? 'cancel' : 'confirm';
}

const cancelValue = (s: DialogState) => (s.kind === 'confirm' ? false : null);

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [text, setText]   = useState('');
  const opener = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const okBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  // ตัวที่แสดงอยู่ (อัปเดตทันที ไม่รอ render) + คิว
  const activeRef = useRef<DialogState | null>(null);
  const queueRef = useRef<DialogState[]>([]);

  const show = useCallback((s: DialogState) => {
    activeRef.current = s;
    setText(s.defaultText ?? '');
    setState(s);
  }, []);

  const open = useCallback((s: DialogState) => {
    if (activeRef.current) { queueRef.current.push(s); return; }
    opener.current = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
    show(s);
  }, [show]);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => {
    const v = o.variant || 'primary';
    open({
      kind: 'confirm', title: o.title, message: o.message, details: o.details, variant: v,
      icon: o.icon || VARIANT_ICON[v],
      confirmText: o.confirmText || 'ยืนยัน', cancelText: o.cancelText || 'ยกเลิก',
      initialFocus: defaultFocus(v, o.initialFocus), dismissible: o.dismissible !== false,
      resolve: r => resolve(r === true),
    });
  }), [open]);

  const notify = useCallback((o: NotifyOptions) => new Promise<void>(resolve => {
    const v = o.variant || 'success';
    open({
      kind: 'notify', title: o.title, message: o.message, details: o.details, variant: v,
      icon: o.icon || VARIANT_ICON[v],
      confirmText: o.okText || 'รับทราบ', cancelText: '', initialFocus: 'confirm', dismissible: true,
      resolve: () => resolve(),
    });
  }), [open]);

  const prompt = useCallback((o: PromptOptions) => new Promise<string | null>(resolve => {
    const v = o.variant || 'primary';
    open({
      kind: 'prompt', title: o.title, message: o.message, details: o.details, variant: v,
      icon: o.icon || VARIANT_ICON[v],
      confirmText: o.confirmText || 'ยืนยัน', cancelText: o.cancelText || 'ยกเลิก',
      placeholder: o.placeholder, required: o.required, initialFocus: 'input', dismissible: o.dismissible !== false,
      defaultText: o.defaultValue,
      resolve: r => resolve(typeof r === 'string' ? r : null),
    });
  }), [open]);

  const close = useCallback((result: boolean | string | null) => {
    const cur = activeRef.current;
    if (!cur) return;
    activeRef.current = null;
    cur.resolve(result);
    const next = queueRef.current.shift();
    if (next) { show(next); return; }
    setState(null);
    const back = opener.current;
    opener.current = null;
    if (back && typeof back.focus === 'function') setTimeout(() => { if (document.contains(back)) back.focus(); }, 0);
  }, [show]);

  const dismissAll = useCallback(() => {
    const q = queueRef.current;
    queueRef.current = [];
    q.forEach(d => d.resolve(cancelValue(d)));
    const cur = activeRef.current;
    if (cur) close(cancelValue(cur));
  }, [close]);

  // focus เริ่มต้น
  useEffect(() => {
    if (!state) return;
    const el = state.initialFocus === 'input' ? input.current
      : state.initialFocus === 'cancel' && cancelBtn.current ? cancelBtn.current
      : okBtn.current;
    el?.focus();
    // เปิด dialog ใหม่เท่านั้น (ไม่ทำซ้ำเมื่อพิมพ์)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!state) return;
    if (e.key === 'Escape') { e.preventDefault(); if (state.dismissible) close(cancelValue(state)); return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(n => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const promptInvalid = state?.kind === 'prompt' && !!state.required && !text.trim();
  const okClass = state?.variant === 'danger' ? 'aq-btn aq-btn-danger-solid' : 'aq-btn aq-btn-primary';
  const tone = state ? VARIANT_TONE[state.variant] : 'primary';

  return (
    <DialogContext.Provider value={{ confirm, notify, prompt, dismissAll }}>
      {children}
      {state && (
        <div
          className="aq-dialog-backdrop"
          onMouseDown={e => {
            if (e.target !== e.currentTarget || !state.dismissible) return;
            if (state.kind === 'prompt' && text.trim()) return; // พิมพ์แล้ว = ไม่ปิด
            close(cancelValue(state));
          }}
        >
          <div
            ref={panel}
            className={`aq-dialog aq-dialog--${tone}`}
            role="dialog" aria-modal="true" aria-labelledby={titleId}
            aria-describedby={state.message || state.details ? descId : undefined}
            onKeyDown={onKeyDown}
          >
            <div className="aq-dialog__head">
              <Icon name={state.icon} size={24} className="aq-dialog__icon" />
              <h2 className="aq-dialog__title" id={titleId}>{state.title}</h2>
            </div>
            {(state.message || state.details) && (
              <div id={descId} className="aq-dialog__body">
                {state.message && <div className="aq-dialog__msg">{state.message}</div>}
                {state.details && <div className="aq-dialog__details">{state.details}</div>}
              </div>
            )}

            {state.kind === 'prompt' && (
              <div className="aq-field aq-dialog__field">
                <textarea
                  ref={input}
                  className="aq-textarea"
                  rows={3}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={state.placeholder || ''}
                  aria-label={state.placeholder || state.title}
                  aria-required={state.required || undefined}
                  aria-describedby={promptInvalid ? `${uid}-req` : undefined}
                />
                {promptInvalid && <p className="aq-help" id={`${uid}-req`}>ต้องระบุเหตุผล</p>}
              </div>
            )}

            <div className="aq-dialog__actions">
              {state.cancelText && (
                <button ref={cancelBtn} type="button" className="aq-btn" onClick={() => close(cancelValue(state))}>
                  {state.cancelText}
                </button>
              )}
              <button
                ref={okBtn} type="button" className={okClass}
                onClick={() => close(state.kind === 'prompt' ? text.trim() : true)}
                disabled={promptInvalid}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}
