/**
 * Textarea — shadcn textarea ปรับตาม ADR-UI-002 D3 + saas-spec §C2
 * ไม่มี utility display (block/flex) ใน base: narrative TH/EN สลับด้วย attribute `hidden` (D7.2)
 * narrative ใส่เพิ่ม: `aq-textarea--prose min-h-[24rem] leading-[1.75]`
 */
import * as React from 'react';

import { cn } from '@/lib/ui/cn';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'min-h-24 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2.5 text-base text-foreground transition-colors placeholder:text-muted-foreground read-only:bg-muted disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-destructive',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
