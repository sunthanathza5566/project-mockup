/**
 * Button — shadcn button (registry v3, new-york) ปรับตาม ADR-UI-002 D3 + saas-spec §C1
 * - hook `aq-btn` ใน base (target audit 44px) · size compact ใส่ `aq-btn-compact` (40px ที่ ≥1024)
 * - ไม่ห้ามตัดบรรทัด (ข้อความไทยยาวต้องขึ้นบรรทัดใหม่ได้) · ไม่มี ring และไม่ลบ outline (ใช้ outline กลางใน base)
 * - disabled ไม่ใช้ opacity — ใช้พื้น muted + ตัวอักษร muted-foreground (คู่ #6)
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/ui/cn';

const buttonVariants = cva(
  'aq-btn inline-flex items-center justify-center gap-2 rounded-md text-base font-medium text-center no-underline transition-colors duration-fast ease-hover [&_svg]:shrink-0 ' +
    'disabled:pointer-events-none disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none ' +
    'aria-disabled:pointer-events-none aria-disabled:border-transparent aria-disabled:bg-muted aria-disabled:text-muted-foreground aria-disabled:shadow-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        outline: 'border border-input bg-card text-foreground hover:bg-accent',
        ghost: 'text-foreground hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        destructiveOutline: 'border border-destructive bg-card text-destructive hover:bg-destructive-muted',
      },
      size: {
        default: 'min-h-11 px-4 py-2',
        compact: 'aq-btn-compact min-h-11 px-3 py-1.5 lg:min-h-10',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** ให้ลูก (เช่น <Link>) เป็น element จริงแต่ได้หน้าตาปุ่ม */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        // <button> ค่าเริ่ม type=button (กัน submit ฟอร์มโดยไม่ตั้งใจ) — asChild ไม่ใส่ type
        {...(asChild ? {} : { type: type ?? 'button' })}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
