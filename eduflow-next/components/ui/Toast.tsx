'use client';

/**
 * Toast stack — หน้าตาตาม ADR-UI-002 saas-spec §C13 (logic/role/testid เดิมของ ADR-UI-001 C14)
 * - ≥768 มุมขวาล่าง กว้าง 25rem · ต่ำกว่า md ล่างเต็มกว้าง (หลบ sticky action bar ด้วย --actionbar-h)
 * - การ์ด bg-popover ขอบ 1px · ไอคอนสถานะ 20 สี TONE_TEXT · ปุ่มปิด ghost 44×44 มุมขวาบน · ปุ่ม action = outline compact
 * - แถบเวลา 2px ล่างสุด (duration inline = อายุ toast, หยุดเมื่อ hover/focus)
 * - container aria-live="polite" · toast error ใช้ role="alert"
 */
import { useToast, type ToastItem } from '@/context/ToastContext';
import { cn } from '@/lib/ui/cn';
import { TONE_TEXT } from '@/lib/ui/tone';
import { Button } from './primitives/button';
import Icon, { type IconName } from './Icon';

const ICON: Record<ToastItem['type'], IconName> = { success: 'check-circle', error: 'x-circle', info: 'info' };
const TONE: Record<ToastItem['type'], keyof typeof TONE_TEXT> = { success: 'ok', error: 'bad', info: 'info' };

export default function Toast() {
  const { toasts, dismiss, pause, resume } = useToast();
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--actionbar-h,0px)+1rem)] z-toast flex flex-col gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-[25rem]"
      aria-live="polite" aria-relevant="additions"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border bg-popover py-4 pl-4 pr-14 text-popover-foreground shadow-lg dark:shadow-none',
            t.leaving ? 'animate-toast-out' : 'animate-toast-in',
          )}
          role={t.type === 'error' ? 'alert' : undefined}
          data-testid="toast"
          onMouseEnter={() => pause(t.id)} onMouseLeave={() => resume(t.id)}
          onFocus={() => pause(t.id)}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resume(t.id); }}
        >
          <Icon name={ICON[t.type]} size={20} className={cn('mt-0.5', TONE_TEXT[TONE[t.type]])} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-base text-foreground">{t.msg}</p>
            {t.action && (
              <Button
                variant="outline" size="compact" className="mt-2"
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
              >
                {t.action.label}
              </Button>
            )}
          </div>
          <Button
            variant="ghost" size="icon" className="absolute right-1 top-1 text-muted-foreground hover:text-foreground"
            aria-label="ปิดข้อความ" onClick={() => dismiss(t.id)}
          >
            <Icon name="x" size={20} />
          </Button>
          {t.durationMs > 0 && (
            <span
              className={cn('absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary animate-toast-time', t.paused && '[animation-play-state:paused]')}
              aria-hidden="true" style={{ animationDuration: `${t.durationMs}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
