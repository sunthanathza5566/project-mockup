/**
 * NativeSelect — เขียนเองตามหน้าตา shadcn native-select (ADR-UI-002 D3, saas-spec §C2)
 * ห่อ <select> จริง (E2E ใช้ selectOption) + chevron · ref/testid/label/aria-* ทั้งหมดไปที่ <select>
 * <option> ไม่จัดสไตล์ — color-scheme จาก next-themes ทำให้ dropdown มืดเองในธีมมืด
 */
import * as React from 'react';

import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/ui/cn';

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** class ของ div ห่อ (ความกว้าง/ตำแหน่งใน layout) */
  wrapperClassName?: string;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn('relative min-w-0', wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          'peer min-h-11 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-card py-2 pl-3 pr-10 text-base text-foreground transition-colors disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-destructive',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground peer-disabled:text-muted-foreground"
      />
    </div>
  ),
);
NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
