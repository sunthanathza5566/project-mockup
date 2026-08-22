'use client';

/**
 * Dialog กลางจอ — ป๊อปอัปแจ้งเตือน/ยืนยันที่ผู้ใช้ต้องเห็นและกดรับทราบ (ไม่ใช่ toast มุมจอ)
 *
 * ใช้แทน window.confirm / window.prompt / (success toast สำคัญ) ทั้งระบบ
 *   - confirm(opts) → Promise<boolean>   ยืนยันก่อนทำรายการ (เพิ่ม/ลบ/ยกเลิก/ยืนยัน ฯลฯ)
 *   - notify(opts)  → Promise<void>      แจ้งผลสำเร็จ/ผิดพลาด กลางจอ ปุ่มเดียว
 *   - prompt(opts)  → Promise<string|null>  ขอเหตุผล/ข้อความก่อนทำรายการ
 *
 * ทุกอย่างเป็น Promise → เขียน handler เป็น async ได้ตรงไปตรงมา
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type DialogVariant = 'primary' | 'danger' | 'success' | 'warning' | 'info';

interface BaseOptions {
  title: string;
  message?: ReactNode;
  variant?: DialogVariant;
  icon?: string;
}
interface ConfirmOptions extends BaseOptions {
  confirmText?: string;
  cancelText?: string;
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
  variant: DialogVariant;
  icon: string;
  confirmText: string;
  cancelText: string;
  placeholder?: string;
  required?: boolean;
  resolve: (v: boolean | string | null) => void;
}

interface DialogContextValue {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  notify:  (o: NotifyOptions)  => Promise<void>;
  prompt:  (o: PromptOptions)  => Promise<string | null>;
}

const noop = async () => {};
const DialogContext = createContext<DialogContextValue>({
  confirm: async () => false, notify: noop, prompt: async () => null,
});

const VARIANT_ICON: Record<DialogVariant, string> = {
  primary: '❓', danger: '⚠️', success: '✅', warning: '⚠️', info: 'ℹ️',
};
const VARIANT_COLOR: Record<DialogVariant, string> = {
  primary: 'var(--brown-dark)', danger: 'var(--absent)', success: 'var(--success)',
  warning: 'var(--late)', info: 'var(--brown-dark)',
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [text, setText]   = useState('');

  const open = useCallback((s: Omit<DialogState, 'resolve'> & { resolve: DialogState['resolve'] }) => {
    setText('');
    setState(s);
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => {
    const v = o.variant || 'primary';
    open({
      kind: 'confirm', title: o.title, message: o.message, variant: v,
      icon: o.icon || VARIANT_ICON[v],
      confirmText: o.confirmText || 'ยืนยัน', cancelText: o.cancelText || 'ยกเลิก',
      resolve: r => resolve(r === true),
    });
  }), [open]);

  const notify = useCallback((o: NotifyOptions) => new Promise<void>(resolve => {
    const v = o.variant || 'success';
    open({
      kind: 'notify', title: o.title, message: o.message, variant: v,
      icon: o.icon || VARIANT_ICON[v],
      confirmText: o.okText || 'รับทราบ', cancelText: '',
      resolve: () => resolve(),
    });
  }), [open]);

  const prompt = useCallback((o: PromptOptions) => new Promise<string | null>(resolve => {
    const v = o.variant || 'primary';
    open({
      kind: 'prompt', title: o.title, message: o.message, variant: v,
      icon: o.icon || VARIANT_ICON[v],
      confirmText: o.confirmText || 'ยืนยัน', cancelText: o.cancelText || 'ยกเลิก',
      placeholder: o.placeholder, required: o.required,
      resolve: r => resolve(typeof r === 'string' ? r : null),
    });
    if (o.defaultValue) setText(o.defaultValue);
  }), [open]);

  function close(result: boolean | string | null) {
    if (!state) return;
    state.resolve(result);
    setState(null);
  }

  const color = state ? VARIANT_COLOR[state.variant] : 'var(--brown-dark)';
  const promptInvalid = state?.kind === 'prompt' && state.required && !text.trim();

  return (
    <DialogContext.Provider value={{ confirm, notify, prompt }}>
      {children}
      {state && (
        <div
          role="dialog" aria-modal="true"
          onClick={() => close(state.kind === 'notify' ? null : (state.kind === 'confirm' ? false : null))}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(18,10,4,0.6)',
            backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(400px, 94vw)', background: 'var(--warm-white)', borderRadius: 16,
              padding: '1.6rem 1.5rem', textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '2.6rem', marginBottom: '0.5rem', lineHeight: 1 }}>{state.icon}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color, marginBottom: state.message ? '0.5rem' : '1rem', fontFamily: "'Cormorant Garamond', serif" }}>
              {state.title}
            </div>
            {state.message && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-body)', marginBottom: '1.1rem', lineHeight: 1.6 }}>
                {state.message}
              </div>
            )}

            {state.kind === 'prompt' && (
              <textarea
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={state.placeholder || ''}
                rows={2}
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 10,
                  background: 'var(--cream)', fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem',
                  color: 'var(--text-body)', outline: 'none', resize: 'vertical', marginBottom: '1rem',
                }}
              />
            )}

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => close(state.kind === 'prompt' ? text.trim() : true)}
                disabled={promptInvalid}
                style={{
                  flex: 1, minHeight: 46, border: 'none', borderRadius: 10, cursor: promptInvalid ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.92rem', color: 'var(--cream)', opacity: promptInvalid ? 0.5 : 1,
                  background: color, fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {state.confirmText}
              </button>
              {state.cancelText && (
                <button
                  onClick={() => close(state.kind === 'prompt' ? null : false)}
                  style={{
                    flex: 1, minHeight: 46, borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.92rem',
                    color: 'var(--brown-deep)', background: 'transparent', border: '1px solid var(--border)',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {state.cancelText}
                </button>
              )}
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
