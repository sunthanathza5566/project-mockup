'use client';

/**
 * Toast stack (ADR-UI-001 components.md C14, ลูกเล่น L4)
 * - ≥768 มุมขวาล่าง กว้าง 400 · ต่ำกว่า md ล่างกลางเต็มกว้าง (หลบ sticky action bar ด้วย --actionbar-h)
 * - พื้น surface ขอบซ้าย 4px สี tone · ไอคอน tone 20 · ปุ่มปิด 44×44 · ปุ่ม action (ghost) · เส้นเวลา 3px ล่างสุด
 * - container aria-live="polite" · toast error ใช้ role="alert"
 */
import { useToast, type ToastItem } from '@/context/ToastContext';
import Icon, { type IconName } from './Icon';

const ICON: Record<ToastItem['type'], IconName> = { success: 'check-circle', error: 'x-circle', info: 'info' };
const TONE: Record<ToastItem['type'], string> = { success: 'ok', error: 'bad', info: 'info' };

export default function Toast() {
  const { toasts, dismiss, pause, resume } = useToast();
  return (
    <div className="aq-toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`aq-toast aq-toast--${TONE[t.type]}${t.leaving ? ' is-leaving' : ''}${t.paused ? ' is-paused' : ''}`}
          role={t.type === 'error' ? 'alert' : undefined}
          data-testid="toast"
          onMouseEnter={() => pause(t.id)} onMouseLeave={() => resume(t.id)}
          onFocus={() => pause(t.id)}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resume(t.id); }}
        >
          <Icon name={ICON[t.type]} size={20} className="aq-toast__icon" />
          <div className="aq-toast__body">
            <p className="aq-toast__msg">{t.msg}</p>
            {t.action && (
              <button
                type="button" className="aq-btn aq-btn-ghost aq-toast__action"
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button type="button" className="aq-btn aq-btn-ghost aq-btn-icon aq-toast__close" aria-label="ปิดข้อความ" onClick={() => dismiss(t.id)}>
            <Icon name="x" size={20} />
          </button>
          {t.durationMs > 0 && (
            <span className="aq-toast__time" aria-hidden="true" style={{ animationDuration: `${t.durationMs}ms` }} />
          )}
        </div>
      ))}
    </div>
  );
}
