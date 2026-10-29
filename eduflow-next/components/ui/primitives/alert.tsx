/**
 * Alert — shadcn alert ปรับตาม ADR-UI-002 saas-spec §C7 (หน้าตาของ InlineMessage)
 * โทนจาก MSG_TONE (ขอบ + พื้นอ่อน) · เนื้อความ text-foreground (คู่ #30–33) · ไอคอนใช้สีโทน
 * role ค่าเริ่ม `status` — ข้อความ error ที่ต้องประกาศทันทีให้ผู้เรียกส่ง role="alert"
 */
import * as React from 'react';

import { cn } from '@/lib/ui/cn';
import { MSG_TONE, type MsgTone } from '@/lib/ui/tone';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: MsgTone;
  /** ไอคอน (เช่น <Icon name="info" />) — ได้สีตามโทนอัตโนมัติ */
  icon?: React.ReactNode;
  large?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = 'info', icon, large, role = 'status', children, ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      className={cn(
        'flex w-full gap-3 rounded-lg border text-base text-foreground',
        large ? 'p-5' : 'p-4',
        MSG_TONE[tone].box,
        className,
      )}
      {...props}
    >
      {icon ? <span className={cn('mt-0.5 shrink-0', MSG_TONE[tone].icon)}>{icon}</span> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  ),
);
Alert.displayName = 'Alert';

export interface AlertTitleProps extends React.HTMLAttributes<HTMLParagraphElement> {
  large?: boolean;
}

const AlertTitle = React.forwardRef<HTMLParagraphElement, AlertTitleProps>(({ className, large, ...props }, ref) => (
  <p ref={ref} className={cn('font-medium text-foreground', large && 'text-lg', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('text-base text-foreground', className)} {...props} />,
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
