/**
 * Input — shadcn input ปรับตาม ADR-UI-002 D3 + saas-spec §C2
 * สูง ≥44px (min-h-11) · ขอบ border-input (≥3:1, คู่ #14–16) · focus = outline กลางใน base
 */
import * as React from 'react';

import { cn } from '@/lib/ui/cn';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex min-h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground read-only:bg-muted disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-[invalid=true]:border-destructive',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
